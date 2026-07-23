const db = require('../config/db');

exports.releaseStaleLeadsToFreePool = async () => {
  let scanned = 0;
  let moved = 0;
  let skipped = 0;
  let inactive_days = 30;

  try {
    // 1. Read inactive days from app_settings
    const [settingsRows] = await db.query(`SELECT setting_value FROM app_settings WHERE setting_key = 'free_leads_inactive_days'`);
    if (settingsRows.length > 0 && settingsRows[0].setting_value) {
      const parsedDays = parseInt(settingsRows[0].setting_value, 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        inactive_days = parsedDays;
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactive_days);

    const tablesToScan = ['working_sheet', 'direct_leads'];

    for (const tableName of tablesToScan) {
      // 2 & 3. Scan tables for potentially eligible leads
      const query = `
        SELECT * FROM ${tableName}
        WHERE (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
          AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
          AND (status_lock_type IS NULL OR status_lock_type != 'KYC_DONE')
          AND (status1_timestamp IS NOT NULL OR status2_timestamp IS NOT NULL OR status3_timestamp IS NOT NULL)
          AND (LOWER(TRIM(status1)) NOT IN ('not int', 'wrong no') OR status1 IS NULL)
          AND (LOWER(TRIM(status2)) NOT IN ('not int', 'wrong no') OR status2 IS NULL)
          AND (LOWER(TRIM(status3)) NOT IN ('not int', 'wrong no') OR status3 IS NULL)
      `;
      const [leads] = await db.query(query);
      scanned += leads.length;

      for (const lead of leads) {
        // 4. Find eligible stale leads
        const t1 = lead.status1_timestamp ? new Date(lead.status1_timestamp) : null;
        const t2 = lead.status2_timestamp ? new Date(lead.status2_timestamp) : null;
        const t3 = lead.status3_timestamp ? new Date(lead.status3_timestamp) : null;

        const validDates = [t1, t2, t3].filter(d => d !== null);
        if (validDates.length === 0) {
          skipped++;
          continue;
        }

        const latestTimestamp = new Date(Math.max(...validDates.map(d => d.getTime())));
        if (latestTimestamp > cutoffDate) {
          skipped++;
          continue;
        }

        // Process this eligible lead
        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();

          // Avoid duplicates check
          const [existingCheck] = await connection.query(
            `SELECT id FROM free_leads WHERE original_table = ? AND original_lead_id = ?`,
            [tableName, lead.id]
          );
          if (existingCheck.length > 0) {
            await connection.rollback();
            skipped++;
            continue;
          }

          // 5. Insert into free_leads
          const [insertFreeLeadResult] = await connection.query(
            `INSERT INTO free_leads (
              original_table, original_lead_id, lead_name, lead_contact, contact_last10,
              previous_telecaller_id, current_telecaller_id, source, original_created_at,
              status1, status1_remark, status1_timestamp,
              status2, status2_remark, status2_timestamp,
              status3, status3_remark, status3_timestamp,
              status4, status4_remark, status4_timestamp,
              moved_to_free_at, fetched_at, free_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, 'AVAILABLE')`,
            [
              tableName,
              lead.id,
              lead.lead_name || lead.client_name, // fallback mapping if column differs
              lead.lead_contact || lead.mobile_number,
              lead.contact_last10 || (lead.lead_contact ? lead.lead_contact.slice(-10) : lead.mobile_number ? lead.mobile_number.slice(-10) : null),
              lead.telecaller_id,
              null,
              lead.source || 'UNKNOWN',
              lead.created_at,
              lead.status1, lead.status1_remark, lead.status1_timestamp,
              lead.status2, lead.status2_remark, lead.status2_timestamp,
              lead.status3, lead.status3_remark, lead.status3_timestamp,
              null, null, null
            ]
          );
          const freeLeadId = insertFreeLeadResult.insertId;

          // 6. Update original table
          await connection.query(
            `UPDATE ${tableName} SET is_released_to_free_pool = 1, free_released_at = NOW(), free_lead_id = ? WHERE id = ?`,
            [freeLeadId, lead.id]
          );

          // Get previous telecaller name
          let previousTelecallerName = 'Unknown';
          if (lead.telecaller_id) {
             const [tcRows] = await connection.query(`SELECT telecaller_name FROM telecaller_master WHERE id = ?`, [lead.telecaller_id]);
             if (tcRows.length > 0) {
               previousTelecallerName = tcRows[0].telecaller_name;
             }
          }

          // 7. Insert into free_lead_history
          await connection.query(
            `INSERT INTO free_lead_history (
              free_lead_id, telecaller_id, telecaller_name, action_type,
              status1, status1_remark, status1_timestamp,
              status2, status2_remark, status2_timestamp,
              status3, status3_remark, status3_timestamp,
              status4, status4_remark, status4_timestamp,
              notes
            ) VALUES (?, ?, ?, 'MOVED_TO_FREE', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
            [
              freeLeadId,
              lead.telecaller_id,
              previousTelecallerName,
              lead.status1, lead.status1_remark, lead.status1_timestamp,
              lead.status2, lead.status2_remark, lead.status2_timestamp,
              lead.status3, lead.status3_remark, lead.status3_timestamp,
              'Moved to free pool after inactive days with no status update'
            ]
          );

          await connection.commit();
          moved++;
        } catch (error) {
          await connection.rollback();
          console.error(`Error processing lead ${lead.id} in ${tableName}:`, error);
          skipped++;
        } finally {
          connection.release();
        }
      }
    }

    // 8. Scan transferred_leads for free pool eligibility
    const [transferredLeads] = await db.query(`
      SELECT * FROM transferred_leads
      WHERE transfer_status = 'COMPLETED'
        AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
        AND (is_closed_lead = 0 OR is_closed_lead IS NULL)
        AND status4_timestamp IS NOT NULL
        AND (LOWER(TRIM(status4)) NOT IN ('not int', 'wrong no'))
    `);
    
    scanned += transferredLeads.length;

    for (const lead of transferredLeads) {
      const s4Time = new Date(lead.status4_timestamp);
      if (s4Time > cutoffDate) {
        skipped++;
        continue;
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        const [existingCheck] = await connection.query(
          `SELECT id FROM free_leads WHERE original_table = 'transferred_leads' AND original_lead_id = ?`,
          [lead.id]
        );
        if (existingCheck.length > 0) {
          await connection.rollback();
          skipped++;
          continue;
        }

        const [insertFreeLeadResult] = await connection.query(
          `INSERT INTO free_leads (
            original_table, original_lead_id, lead_name, lead_contact, contact_last10,
            previous_telecaller_id, current_telecaller_id, source, original_created_at,
            status1, status1_remark, status1_timestamp,
            status2, status2_remark, status2_timestamp,
            status3, status3_remark, status3_timestamp,
            status4, status4_remark, status4_timestamp,
            moved_to_free_at, fetched_at, free_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, 'AVAILABLE')`,
          [
            'transferred_leads',
            lead.id,
            lead.lead_name,
            lead.lead_contact,
            lead.contact_last10,
            lead.current_telecaller_id,
            null,
            lead.source,
            lead.original_created_at,
            lead.status1, lead.status1_remark, lead.status1_timestamp,
            lead.status2, lead.status2_remark, lead.status2_timestamp,
            lead.status3, lead.status3_remark, lead.status3_timestamp,
            null, null, null
          ]
        );
        const freeLeadId = insertFreeLeadResult.insertId;

        await connection.query(
          `UPDATE transferred_leads SET is_released_to_free_pool = 1, free_released_at = NOW(), free_lead_id = ? WHERE id = ?`,
          [freeLeadId, lead.id]
        );

        let previousTelecallerName = 'Unknown';
        if (lead.current_telecaller_id) {
           const [tcRows] = await connection.query(`SELECT telecaller_name FROM telecaller_master WHERE id = ?`, [lead.current_telecaller_id]);
           if (tcRows.length > 0) {
             previousTelecallerName = tcRows[0].telecaller_name;
           }
        }

        await connection.query(
          `INSERT INTO free_lead_history (
            free_lead_id, telecaller_id, telecaller_name, action_type,
            status1, status1_remark, status1_timestamp,
            status2, status2_remark, status2_timestamp,
            status3, status3_remark, status3_timestamp,
            status4, status4_remark, status4_timestamp,
            notes
          ) VALUES (?, ?, ?, 'MOVED_TO_FREE', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
          [
            freeLeadId,
            lead.current_telecaller_id,
            previousTelecallerName,
            lead.status1, lead.status1_remark, lead.status1_timestamp,
            lead.status2, lead.status2_remark, lead.status2_timestamp,
            lead.status3, lead.status3_remark, lead.status3_timestamp,
            'Moved to free pool after inactive days with no status update (from Transferred Leads)'
          ]
        );

        await connection.commit();
        moved++;
      } catch (error) {
        await connection.rollback();
        console.error(`Error processing transferred lead ${lead.id}:`, error);
        skipped++;
      } finally {
        connection.release();
      }
    }

    return {
      success: true,
      scanned,
      moved,
      skipped,
      inactive_days
    };

  } catch (error) {
    console.error("releaseStaleLeadsToFreePool Error:", error);
    throw error;
  }
};
