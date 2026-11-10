const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  try {
    const query = `
      SELECT working_sheet.*, COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      CASE
        WHEN COALESCE(call_stats.total_calls, 0) > 0 THEN 'CONNECTED'
        ELSE 'NOT_CALLED'
      END AS call_dot_type,
      (wc.customer_response = 'INTERESTED') AS is_wa_interested
      FROM working_sheet
      LEFT JOIN telecaller_master tm1 ON working_sheet.telecaller_id = tm1.id
      LEFT JOIN (
        SELECT
          normalized_number,
          COUNT(*) AS total_calls
        FROM callpulse_call_logs
        GROUP BY normalized_number
      ) call_stats
        ON call_stats.normalized_number = RIGHT(REGEXP_REPLACE(working_sheet.lead_contact, '[^0-9]', ''), 10)
      LEFT JOIN whatsapp_conversations wc ON working_sheet.lead_contact = wc.phone_number
      LIMIT 1
    `;
    const [rows] = await conn.execute(query);
    console.log("Success admin leads query");
  } catch(e) {
    console.log("Error admin leads query:", e.message);
  }

  await conn.end();
}
run();
