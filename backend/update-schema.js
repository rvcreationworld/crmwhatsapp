const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  try {
    await conn.query("ALTER TABLE telecaller_master ADD COLUMN bot_leads_paused BOOLEAN NOT NULL DEFAULT FALSE;");
    console.log("Column bot_leads_paused added successfully");
  } catch(e) {
    console.log("Error:", e.message);
  }

  await conn.end();
}
run();
