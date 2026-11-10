// This is a manual repair utility query to fix callpulse_call_logs that were mistakenly logged as BOT instead of FREE.
// DO NOT EXECUTE AUTOMATICALLY. This is kept here for documentation and manual usage.

const db = require('../config/db');

async function repairMistakenBotLogsToFree() {
  try {
    const [result] = await db.query(`
      UPDATE callpulse_call_logs cl
      JOIN free_leads fl ON 
          cl.normalized_number = fl.contact_last10 
          AND cl.telecaller_id = fl.current_telecaller_id
      SET 
          cl.lead_type = 'FREE',
          cl.lead_id = fl.id
      WHERE 
          cl.lead_type = 'BOT'
          AND fl.free_status IN ('ASSIGNED', 'COMPLETED')
          AND cl.call_started_at >= fl.fetched_at;
    `);

    console.log("Repair complete. Rows affected:", result.affectedRows);
  } catch (err) {
    console.error("Error running repair:", err);
  }
}

// repairMistakenBotLogsToFree();
