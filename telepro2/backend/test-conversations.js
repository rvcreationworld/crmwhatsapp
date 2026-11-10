const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  const [all] = await conn.execute("SELECT id, phone_number, last_customer_message_at FROM whatsapp_conversations LIMIT 5");
  console.log("Sample conversations:", all);

  const [recent] = await conn.execute("SELECT id, phone_number, last_customer_message_at FROM whatsapp_conversations WHERE last_customer_message_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
  console.log("Recent (24h) count:", recent.length);

  await conn.end();
}
run();
