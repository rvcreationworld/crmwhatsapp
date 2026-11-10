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

    console.log("Deleting old pending queue items...");
    const [result] = await connection.execute("DELETE FROM whatsapp_automation_queue WHERE status = 'PENDING' AND id < 140");
    console.log(`Deleted ${result.affectedRows} old pending rows.`);
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
