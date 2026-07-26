require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const [ws] = await db.query("SELECT id, status1, status2, status3 FROM working_sheet LIMIT 10;");
    console.log(ws);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
