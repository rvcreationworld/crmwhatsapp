const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: '82.25.108.74',
      user: 'shareMaster',
      password: 'Share@2025',
      database: 'crmpro_v2_whatsapp_test',
      port: 3306
    });

    const [rows] = await connection.execute("SELECT raw_payload FROM whatsapp_inbound_messages WHERE interest_detected = 1 ORDER BY id DESC LIMIT 1");
    if (rows.length > 0) {
      console.log(rows[0].raw_payload);
    } else {
      console.log("No interested webhook found.");
    }
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
