const db = require('../config/db');

async function moveEligibleClosedLeads() {
  const result = { success: true, scanned: 0, moved: 0, skipped: 0, inactive_days: 30 };

  try {
    // 1. Get inactive days from app_settings
    const [settings] = await db.query(`SELECT setting_value FROM app_settings WHERE setting_key = 'closed_leads_inactive_days' LIMIT 1`);
    if (settings.length > 0 && settings[0].setting_value) {
      result.inactive_days = parseInt(settings[0].setting_value) || 30;
    }
    const cutoffMs = Date.now() - (result.inactive_days * 24 * 60 * 60 * 1000);

    const isClosedValid = (statusStr) => {
      if (!statusStr) return false;
      const val = statusStr.trim().toLowerCase();
      return val === 'not int' || val === 'wrong no';
    };

    const processStandardLead = async (row, sourceTable) => {
      result.scanned++;
      // Determine latest status
      let latestTime = 0;
      let latestStatus = null;
      let latestLevel = null;

      if (row.status1_timestamp && new Date(row.status1_timestamp).getTime() > latestTime) {
        latestTime = new Date(row.status1_timestamp).getTime();
        latestStatus = row.status1;
        latestLevel = 'STATUS1';
      }
      if (row.status2_timestamp && new Date(row.status2_timestamp).getTime() > latestTime) {
        latestTime = new Date(row.status2_timestamp).getTime();
        latestStatus = row.status2;
        latestLevel = 'STATUS2';
      }
      if (row.status3_timestamp && new Date(row.status3_timestamp).getTime() > latestTime) {
        latestTime = new Date(row.status3_timestamp).getTime();
        latestStatus = row.status3;
        latestLevel = 'STATUS3';
      }

      if (!latestStatus || !latestTime) {
        result.skipped++;
        return;
      }

      if (latestTime <= cutoffMs && isClosedValid(latestStatus)) {
        await moveToClosedLeads(row, sourceTable, latestStatus, latestLevel, new Date(latestTime));
      } else {
        result.skipped++;
      }
    };

    const moveToClosedLeads = async (row, sourceTable, closingStatus, closingLevel, lastUpdatedAt) => {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Check if already closed
        const [existing] = await connection.query(
          `SELECT id FROM closed_leads WHERE source_table = ? AND source_lead_id = ?`,
          [sourceTable, row.id]
        );

        if (existing.length > 0) {
          result.skipped++;
          await connection.commit();
          return;
        }

        // Insert into closed_leads
        const [insertRes] = await connection.query(
          `INSERT INTO closed_leads (
            source_table, source_lead_id, lead_name, lead_contact, contact_last10,
            telecaller_id, telecaller_name, previous_telecaller_id, previous_telecaller_name,
            source, status1, status1_remark, status1_timestamp,
            status2, status2_remark, status2_timestamp,
            status3, status3_remark, status3_timestamp,
            status4, status4_remark, status4_timestamp,
            closing_status, closing_status_level, last_status_updated_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sourceTable,
            row.id,
            row.lead_name,
            row.lead_contact,
            row.contact_last10,
            sourceTable === 'free_leads' ? row.current_telecaller_id : row.telecaller_id,
            row.telecaller_name,
            sourceTable === 'free_leads' ? row.previous_telecaller_id : null,
            sourceTable === 'free_leads' ? row.previous_telecaller_name : null,
            row.source,
            row.status1, row.status1_remark, row.status1_timestamp,
            row.status2, row.status2_remark, row.status2_timestamp,
            row.status3, row.status3_remark, row.status3_timestamp,
            row.status4 || null, row.status4_remark || null, row.status4_timestamp || null,
            closingStatus,
            closingLevel,
            lastUpdatedAt
          ]
        );

        const closedLeadId = insertRes.insertId;

        // Update original table
        await connection.query(
          `UPDATE ${sourceTable} SET is_closed_lead = 1, closed_lead_at = NOW(), closed_lead_id = ? WHERE id = ?`,
          [closedLeadId, row.id]
        );

        await connection.commit();
        result.moved++;
      } catch (err) {
        await connection.rollback();
        console.error(`Failed to move closed lead for ${sourceTable} ID ${row.id}`, err);
        result.skipped++;
      } finally {
        connection.release();
      }
    };

    // 2. Scan working_sheet
    const [wsRows] = await db.query(
      `SELECT w.*, t.telecaller_name 
       FROM working_sheet w 
       LEFT JOIN telecaller_master t ON w.telecaller_id = t.id 
       WHERE (w.is_closed_lead = 0 OR w.is_closed_lead IS NULL)
       AND (w.is_released_to_free_pool = 0 OR w.is_released_to_free_pool IS NULL)
       AND (w.is_kyc_done = 0 OR w.is_kyc_done IS NULL)
       AND (w.status_lock_type IS NULL OR w.status_lock_type != 'KYC_DONE')
       AND (w.status1_timestamp IS NOT NULL OR w.status2_timestamp IS NOT NULL OR w.status3_timestamp IS NOT NULL)`
    );
    for (const row of wsRows) {
      await processStandardLead(row, 'working_sheet');
    }

    // 3. Scan direct_leads
    const [dlRows] = await db.query(
      `SELECT d.*, t.telecaller_name 
       FROM direct_leads d 
       LEFT JOIN telecaller_master t ON d.telecaller_id = t.id 
       WHERE (d.is_closed_lead = 0 OR d.is_closed_lead IS NULL)
       AND (d.is_released_to_free_pool = 0 OR d.is_released_to_free_pool IS NULL)
       AND (d.is_kyc_done = 0 OR d.is_kyc_done IS NULL)
       AND (d.status_lock_type IS NULL OR d.status_lock_type != 'KYC_DONE')
       AND (d.status1_timestamp IS NOT NULL OR d.status2_timestamp IS NOT NULL OR d.status3_timestamp IS NOT NULL)`
    );
    for (const row of dlRows) {
      await processStandardLead(row, 'direct_leads');
    }

    // 4. Scan free_leads
    const [flRows] = await db.query(
      `SELECT f.*, 
              t.telecaller_name,
              pt.telecaller_name as previous_telecaller_name
       FROM free_leads f 
       LEFT JOIN telecaller_master t ON f.current_telecaller_id = t.id 
       LEFT JOIN telecaller_master pt ON f.previous_telecaller_id = pt.id
       WHERE (f.is_closed_lead = 0 OR f.is_closed_lead IS NULL)
       AND f.free_status = 'COMPLETED'
       AND f.status4_timestamp IS NOT NULL`
    );
    for (const row of flRows) {
      result.scanned++;
      const s4Time = new Date(row.status4_timestamp).getTime();
      if (s4Time <= cutoffMs && isClosedValid(row.status4)) {
        await moveToClosedLeads(row, 'free_leads', row.status4, 'STATUS4', new Date(row.status4_timestamp));
      } else {
        result.skipped++;
      }
    }

    // 5. Scan transferred_leads
    const [tlRows] = await db.query(
      `SELECT tl.*, 
              t.telecaller_name,
              pt.telecaller_name as previous_telecaller_name
       FROM transferred_leads tl 
       LEFT JOIN telecaller_master t ON tl.current_telecaller_id = t.id 
       LEFT JOIN telecaller_master pt ON tl.previous_telecaller_id = pt.id
       WHERE (tl.is_closed_lead = 0 OR tl.is_closed_lead IS NULL)
       AND tl.transfer_status = 'COMPLETED'
       AND tl.status4_timestamp IS NOT NULL`
    );
    for (const row of tlRows) {
      result.scanned++;
      const s4Time = new Date(row.status4_timestamp).getTime();
      if (s4Time <= cutoffMs && isClosedValid(row.status4)) {
        await moveToClosedLeads(row, 'transferred_leads', row.status4, 'STATUS4', new Date(row.status4_timestamp));
      } else {
        result.skipped++;
      }
    }

    return result;
  } catch (error) {
    console.error("moveEligibleClosedLeads error:", error);
    throw error;
  }
}

module.exports = {
  moveEligibleClosedLeads
};
