const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  const [recs] = await conn.execute("SELECT COUNT(*) as count FROM whatsapp_recurring_broadcast_recipients WHERE execution_key = 'broadcast:1:2026-07-18'");
  console.log("Tracked recipients:", recs[0].count);

  await conn.end();
}
run();
