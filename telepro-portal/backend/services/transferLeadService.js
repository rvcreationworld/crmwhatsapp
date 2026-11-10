const db = require('../config/db');

/**
 * Transfers a batch of leads to a target telecaller.
 * 
 * @param {Array} leads - Array of { source_table, lead_id }
 * @param {Number} targetTelecallerId 
 * @param {String} transferReason 
 * @param {Number} adminId 
 */
async function transferLeads(leads, targetTelecallerId, transferReason, adminId) {
  const result = { success: true, transferred: 0, skipped: 0, results: [] };

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verify target telecaller
    const [targetTc] = await connection.query(
      `SELECT id, telecaller_name, is_active, is_deleted FROM telecaller_master WHERE id = ?`,
      [targetTelecallerId]
    );

    if (targetTc.length === 0 || !targetTc[0].is_active || targetTc[0].is_deleted) {
      throw new Error("Target telecaller is invalid, inactive, or deleted.");
    }

    for (const lead of leads) {
      const { source_table, lead_id } = lead;

      if (!['working_sheet', 'direct_leads', 'free_leads'].includes(source_table)) {
        result.skipped++;
        result.results.push({ lead_id, error: "Invalid source table" });
        continue;
      }

      // 1. Fetch and validate source lead
      const [sourceRows] = await connection.query(
        `SELECT * FROM ?? WHERE id = ? FOR UPDATE`,
        [source_table, lead_id]
      );

      if (sourceRows.length === 0) {
        result.skipped++;
        result.results.push({ lead_id, error: "Lead not found" });
        continue;
      }

      const row = sourceRows[0];

      // Standard validations
      if (row.is_closed_lead === 1) {
        result.skipped++;
        result.results.push({ lead_id, error: "Lead is already closed" });
        continue;
      }
      if (row.is_transferred_lead === 1) {
        result.skipped++;
        result.results.push({ lead_id, error: "Lead is already transferred" });
        continue;
      }

      // Source specific validations
      if (source_table === 'free_leads') {
        // Handle free_leads check (is_released_to_free_pool might not exist here, check free_status)
        if (!['ASSIGNED', 'COMPLETED'].includes(row.free_status)) {
          result.skipped++;
          result.results.push({ lead_id, error: "Free lead must be ASSIGNED or COMPLETED" });
          continue;
        }
      } else {
        // working_sheet / direct_leads validations
        if (row.is_released_to_free_pool === 1) {
          result.skipped++;
          result.results.push({ lead_id, error: "Lead is released to free pool" });
          continue;
        }
        if (row.is_kyc_done === 1 || row.status_lock_type === 'KYC_DONE') {
          result.skipped++;
          result.results.push({ lead_id, error: "Lead is already KYC Done" });
          continue;
        }
      }

      const currentTcId = source_table === 'free_leads' ? row.current_telecaller_id : row.telecaller_id;
      
      const targetTcIdInt = parseInt(targetTelecallerId, 10);

      if (currentTcId === targetTcIdInt) {
        result.skipped++;
        result.results.push({ lead_id, error: "Target telecaller is the same as current telecaller" });
        continue;
      }

      // Check for duplicates
      const [existingTransfer] = await connection.query(
        `SELECT id FROM transferred_leads WHERE original_table = ? AND original_lead_id = ?`,
        [source_table, lead_id]
      );

      if (existingTransfer.length > 0) {
        result.skipped++;
        result.results.push({ lead_id, error: "Lead is already transferred (duplicate)" });
        continue;
      }

      // 2. Insert into transferred_leads
      const [insertRes] = await connection.query(
        `INSERT INTO transferred_leads (
          original_table, original_lead_id, lead_name, lead_contact, contact_last10,
          previous_telecaller_id, current_telecaller_id, source, original_created_at,
          status1, status1_remark, status1_timestamp,
          status2, status2_remark, status2_timestamp,
          status3, status3_remark, status3_timestamp,
          status4, status4_remark, status4_timestamp,
          transfer_reason, transfer_status, transferred_by_admin_id, transferred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          source_table,
          lead_id,
          row.lead_name,
          row.lead_contact,
          row.contact_last10,
          currentTcId,
          targetTelecallerId,
          row.source || null,
          row.created_at || null,
          row.status1 || null, row.status1_remark || null, row.status1_timestamp || null,
          row.status2 || null, row.status2_remark || null, row.status2_timestamp || null,
          row.status3 || null, row.status3_remark || null, row.status3_timestamp || null,
          null, null, null, // Fresh status4 for target telecaller
          transferReason || null,
          'ASSIGNED',
          adminId || null
        ]
      );

      const transferredLeadId = insertRes.insertId;

      // 3. Update source table
      await connection.query(
        `UPDATE ?? SET is_transferred_lead = 1, transferred_lead_at = NOW(), transferred_lead_id = ? WHERE id = ?`,
        [source_table, transferredLeadId, lead_id]
      );

      // 4. Insert into transferred_lead_history
      // Fetch previous telecaller name for history
      let prevTcName = null;
      if (currentTcId) {
        const [prevTc] = await connection.query(
          `SELECT telecaller_name FROM telecaller_master WHERE id = ?`,
          [currentTcId]
        );
        if (prevTc.length > 0) {
          prevTcName = prevTc[0].telecaller_name;
        }
      }

      await connection.query(
        `INSERT INTO transferred_lead_history (
          transferred_lead_id, telecaller_id, telecaller_name, action_type,
          status1, status1_remark, status1_timestamp,
          status2, status2_remark, status2_timestamp,
          status3, status3_remark, status3_timestamp,
          status4, status4_remark, status4_timestamp,
          notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          transferredLeadId,
          currentTcId,
          prevTcName,
          'TRANSFERRED',
          row.status1 || null, row.status1_remark || null, row.status1_timestamp || null,
          row.status2 || null, row.status2_remark || null, row.status2_timestamp || null,
          row.status3 || null, row.status3_remark || null, row.status3_timestamp || null,
          source_table === 'free_leads' ? (row.status4 || null) : null,
          source_table === 'free_leads' ? (row.status4_remark || null) : null,
          source_table === 'free_leads' ? (row.status4_timestamp || null) : null,
          transferReason || 'Transferred by Admin'
        ]
      );

      result.transferred++;
      result.results.push({ lead_id, success: true });
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("Error in transferLeads transaction:", err);
    throw err;
  } finally {
    connection.release();
  }

  return result;
}

module.exports = {
  transferLeads
};
