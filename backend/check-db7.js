require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const q = `SELECT COUNT(*) as c FROM working_sheet WHERE status1 = 'Ringing' AND status1_timestamp IS NULL;`;
    const [ws] = await db.query(q);
    console.log(ws);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
