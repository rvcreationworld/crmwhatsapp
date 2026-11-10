const db = require('./config/db');

async function backfill() {
  try {
    const [directLogs] = await db.query("SELECT * FROM callpulse_call_logs WHERE lead_type='DIRECT'");
    console.log(`Found ${directLogs.length} DIRECT logs to potentially backfill to BOT leads.`);

    let inserted = 0;
    for (let log of directLogs) {
      const [botLeads] = await db.query(
        "SELECT id FROM working_sheet WHERE telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
        [log.telecaller_id, log.normalized_number, `%${log.normalized_number}`]
      );
      
      for (let bot of botLeads) {
        try {
          await db.query(
            `INSERT INTO callpulse_call_logs 
             (telecaller_id, lead_type, lead_id, dialed_number, normalized_number, call_type, call_started_at, call_ended_at, duration_seconds) 
             VALUES (?, 'BOT', ?, ?, ?, ?, ?, ?, ?)`,
            [log.telecaller_id, bot.id, log.dialed_number, log.normalized_number, log.call_type, log.call_started_at, log.call_ended_at, log.duration_seconds]
          );
          inserted++;
        } catch(e) {
          if (e.code !== 'ER_DUP_ENTRY') console.error(e);
        }
      }
    }
    console.log(`Backfilled ${inserted} BOT logs from existing DIRECT logs.`);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}

backfill();
