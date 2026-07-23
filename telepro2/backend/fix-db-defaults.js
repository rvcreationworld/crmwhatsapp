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

    await connection.execute("ALTER TABLE whatsapp_automation_messages MODIFY trigger_event varchar(100) DEFAULT 'INTERESTED_CLICK'");
    await connection.execute("ALTER TABLE whatsapp_automation_messages MODIFY lead_type enum('DIRECT','BOT','BOTH') DEFAULT 'BOTH'");
    
    console.log("Updated trigger_event and lead_type with default values.");
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
