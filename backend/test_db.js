const mysql = require("mysql2");
require("dotenv").config();
console.log(mysql.authPlugins ? "authPlugins exist" : "no authPlugins");
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  authPlugins: {
    mysql_native_password: mysql.authPlugins.mysql_native_password
  }
});
pool.promise().query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e.message));
