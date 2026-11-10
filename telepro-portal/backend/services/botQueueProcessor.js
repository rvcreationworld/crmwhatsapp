const db = require('../config/db');

const ensureQueueTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_lead_fetch_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telecaller_id INT NOT NULL,
        status ENUM('WAITING','ASSIGNED','CANCELLED') DEFAULT 'WAITING',
        queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_at DATETIME NULL,
        assigned_working_sheet_id INT NULL,
        last_seen_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_bot_queue_telecaller (telecaller_id),
        INDEX idx_bot_queue_status_time (status, queued_at)
      )
    `);
  } catch (err) {
    console.error("Failed to ensure bot_lead_fetch_queue table:", err);
  }
};

// Ensure table on load
ensureQueueTable();

const checkEligibility = async (telecallerId) => {
  try {
    // Check latest assigned bot lead for this telecaller
    const [rows] = await db.query(
      `SELECT * FROM working_sheet 
       WHERE telecaller_id = ? AND (source = 'BOT_POOL' OR lead_type = 'BOT') AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
       AND (is_closed_lead = 0 OR is_closed_lead IS NULL) 
       AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
       AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
       ORDER BY id DESC LIMIT 1`,
      [telecallerId]
    );

    if (rows.length === 0) {
      return { eligible: true, blockingLead: null };
    }

    const latestLead = rows[0];
    if (!latestLead.status1 || String(latestLead.status1).trim() === '' || String(latestLead.status1).trim() === 'None') {
      return {
        eligible: false,
        blockingLead: latestLead,
        message: "Please update Status 1 for your current lead before fetching a new lead."
      };
    }

    return { eligible: true, blockingLead: null };
  } catch (err) {
    console.error("Error checking eligibility:", err);
    throw err;
  }
};

const assignLeadToTelecaller = async (telecallerId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if new_leads has available leads using LIFO (ORDER BY id DESC LIMIT 1)
    const [leads] = await connection.query(
      `SELECT * FROM new_leads ORDER BY id DESC LIMIT 1 FOR UPDATE`
    );

    if (leads.length === 0) {
      await connection.rollback();
      return { assigned: false, lead: null };
    }

    const lead = leads[0];

    // 2. Insert selected lead into working_sheet
    // Omit contact_last10 as it is STORED GENERATED
    const [insertRes] = await connection.query(
      `INSERT INTO working_sheet (lead_name, lead_contact, telecaller_id, source, is_active, created_at)
       VALUES (?, ?, ?, 'BOT_POOL', 1, NOW())`,
      [lead.lead_name, lead.lead_contact, telecallerId]
    );

    const newWorkingSheetId = insertRes.insertId;

    // 3. Delete from new_leads
    await connection.query(`DELETE FROM new_leads WHERE id = ?`, [lead.id]);

    // 4. Update queue if they were in it (mark ASSIGNED so they can re-queue later if needed)
    await connection.query(
      `UPDATE bot_lead_fetch_queue 
       SET status = 'ASSIGNED', assigned_at = NOW(), assigned_working_sheet_id = ?
       WHERE telecaller_id = ?`,
      [newWorkingSheetId, telecallerId]
    );

    await connection.commit();

    // Fetch the newly inserted lead to return
    const [newLeads] = await db.query(`SELECT * FROM working_sheet WHERE id = ?`, [newWorkingSheetId]);
    return { assigned: true, lead: newLeads[0] };
  } catch (err) {
    await connection.rollback();
    console.error("Error assigning lead in transaction:", err);
    throw err;
  } finally {
    connection.release();
  }
};

const processBotLeadQueue = async () => {
  try {
    console.log("[BotQueue] Starting queue processor...");
    
    while (true) {
      // Check if new_leads has any rows
      const [leadCountRes] = await db.query("SELECT COUNT(*) as cnt FROM new_leads");
      if (leadCountRes[0].cnt === 0) {
        break; // No more leads to assign
      }

      // Check waiting queue FIFO (ORDER BY queued_at ASC)
      const [waitingQueue] = await db.query(
        `SELECT telecaller_id FROM bot_lead_fetch_queue 
         WHERE status = 'WAITING' 
         ORDER BY queued_at ASC LIMIT 10`
      );

      if (waitingQueue.length === 0) {
        break; // No waiting telecallers
      }

      let assignedInThisLoop = false;

      for (const queueItem of waitingQueue) {
        // Check eligibility before assigning
        const eligibility = await checkEligibility(queueItem.telecaller_id);
        if (!eligibility.eligible) {
          console.log(`[BotQueue] Telecaller ${queueItem.telecaller_id} is waiting but ineligible (pending Status 1). Skipping.`);
          continue;
        }

        // Try assigning
        const res = await assignLeadToTelecaller(queueItem.telecaller_id);
        if (res.assigned) {
          console.log(`[BotQueue] Automatically assigned lead ID ${res.lead.id} to Telecaller ${queueItem.telecaller_id}`);
          assignedInThisLoop = true;
          break; // Break the for loop and re-check queue from start (FIFO)
        } else {
          // No more leads
          break;
        }
      }

      if (!assignedInThisLoop) {
        // No eligible telecallers were able to receive a lead or no leads available
        break;
      }
    }
    
    console.log("[BotQueue] Queue processing completed.");
  } catch (err) {
    console.error("[BotQueue] Error processing queue:", err);
  }
};

module.exports = {
  ensureQueueTable,
  checkEligibility,
  assignLeadToTelecaller,
  processBotLeadQueue
};
