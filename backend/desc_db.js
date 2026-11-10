require('dotenv').config({path: './.env'});
const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const [rows] = await pool.query("DESCRIBE whatsapp_conversations;");
  console.log(rows);
  process.exit();
}
run();
