const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  timezone: 'Z',
});

const promisePool = pool.promise();

promisePool.query('SELECT 1').then(() => {
  console.log("Connected");
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
