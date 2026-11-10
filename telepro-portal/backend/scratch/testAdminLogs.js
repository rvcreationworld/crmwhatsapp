const db = require('../config/db');

async function test() {
  try {
    let query = `
      SELECT c.*, 
             t.telecaller_name,
             COALESCE(fl_by_id.lead_name, dl_by_id.lead_name, ws_by_id.lead_name, fl_by_number.lead_name, dl_by_number.lead_name, ws_by_number.lead_name, 'Unknown') AS lead_name,
             COALESCE(fl_by_id.lead_contact, dl_by_id.lead_contact, ws_by_id.lead_contact, fl_by_number.lead_contact, dl_by_number.lead_contact, ws_by_number.lead_contact, c.dialed_number, c.normalized_number) AS lead_contact
      FROM callpulse_call_logs c
      JOIN telecaller_master t ON c.telecaller_id = t.id
      LEFT JOIN free_leads fl_by_id
        ON c.lead_type = 'FREE' AND c.lead_id = fl_by_id.id AND c.telecaller_id = fl_by_id.current_telecaller_id
      LEFT JOIN direct_leads dl_by_id
        ON c.lead_type = 'DIRECT' AND c.lead_id = dl_by_id.id AND c.telecaller_id = dl_by_id.telecaller_id
      LEFT JOIN working_sheet ws_by_id
        ON c.lead_type = 'BOT' AND c.lead_id = ws_by_id.id AND c.telecaller_id = ws_by_id.telecaller_id
      LEFT JOIN free_leads fl_by_number
        ON c.telecaller_id = fl_by_number.current_telecaller_id AND c.normalized_number = fl_by_number.contact_last10 COLLATE utf8mb4_unicode_ci
      LEFT JOIN direct_leads dl_by_number
        ON c.telecaller_id = dl_by_number.telecaller_id AND c.normalized_number = dl_by_number.contact_last10
      LEFT JOIN working_sheet ws_by_number
        ON c.telecaller_id = ws_by_number.telecaller_id AND c.normalized_number = RIGHT(REGEXP_REPLACE(ws_by_number.lead_contact, '[^0-9]', ''), 10)
      WHERE 1=1 LIMIT 1
    `;
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    await db.query(countQuery);
    const [rows] = await db.query(query);
    console.log("Success", rows.length);
  } catch (err) {
    console.error("SQL Error:", err.message);
  }
  process.exit(0);
}
test();
