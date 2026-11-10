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

    await connection.execute('ALTER TABLE whatsapp_automation_messages CHANGE execution_order display_order INT DEFAULT 1');
    console.log("Renamed execution_order to display_order successfully.");
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
