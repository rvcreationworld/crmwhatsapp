require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const q = `SELECT id, lead_name, status1, status2, status3, status3_timestamp FROM working_sheet WHERE status3 = 'Ringing' LIMIT 5;`;
    const [ws] = await db.query(q);
    console.log(ws);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
