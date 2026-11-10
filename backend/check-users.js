const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  const [cols] = await conn.execute("DESCRIBE admin_users");
  console.log(cols.map(c => c.Field));
  await conn.end();
}
run();
