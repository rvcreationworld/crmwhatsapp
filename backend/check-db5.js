require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const ringingCondition = `(
      (status3 = 'Ringing')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Ringing')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Ringing')
    )`;
    const q = `SELECT id, lead_name, status1, status2, status3, DATE(status1_timestamp) as d1, DATE(status2_timestamp) as d2, DATE(status3_timestamp) as d3 FROM working_sheet WHERE ${ringingCondition} LIMIT 10;`;
    const [ws] = await db.query(q);
    console.log("Without date filter:");
    console.log(ws);
    
    const dateQ = `SELECT id, lead_name, status1, status2, status3, DATE(status1_timestamp) as d1, DATE(status2_timestamp) as d2, DATE(status3_timestamp) as d3 FROM working_sheet WHERE (
      (status3 = 'Ringing' AND DATE(status3_timestamp) < CURDATE())
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Ringing' AND DATE(status2_timestamp) < CURDATE())
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Ringing' AND DATE(status1_timestamp) < CURDATE())
    ) LIMIT 10;`;
    const [wsDate] = await db.query(dateQ);
    console.log("WITH date filter:");
    console.log(wsDate);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
