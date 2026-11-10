const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
});

const promisePool = pool.promise();

// Test the database connection on startup
promisePool.query('SELECT 1')
  .then(() => {
    console.log(`✅ Connected to database: ${process.env.DB_NAME}`);
  })
  .catch((err) => {
    console.error(`❌ Database connection failed:`, err.message);
  });

module.exports = promisePool;
