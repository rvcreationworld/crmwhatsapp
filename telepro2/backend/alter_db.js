require('dotenv').config({path: './.env'});
const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  try {
    await pool.query("ALTER TABLE telecaller_campaigns ADD COLUMN auto_sync TINYINT(1) DEFAULT 1;");
    console.log("Column auto_sync added successfully.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column auto_sync already exists.");
    } else {
      console.error(err);
    }
  }
  process.exit();
}
run();
