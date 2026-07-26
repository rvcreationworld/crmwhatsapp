require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const q1 = `SELECT @@global.time_zone, @@session.time_zone, NOW(), UTC_TIMESTAMP();`;
    const [t] = await db.query(q1);
    console.log("Timezones:");
    console.log(t);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
