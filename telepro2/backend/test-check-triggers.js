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

    const [rows] = await connection.execute("SELECT id, automation_name, trigger_type FROM whatsapp_automation_messages");
    console.log(rows);
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
