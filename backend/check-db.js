require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const [rows] = await db.query("SELECT * FROM dhan_clients");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
