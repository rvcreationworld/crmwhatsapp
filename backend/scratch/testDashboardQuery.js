const db = require('../config/db');

async function run() {
  const chartDateExpr = `
      CASE
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status3_timestamp)
        WHEN status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL THEN status1_timestamp
        WHEN status2_timestamp IS NOT NULL THEN status2_timestamp
        WHEN status3_timestamp IS NOT NULL THEN status3_timestamp
        ELSE created_at
      END
    `;
    
  try {
    const [rows] = await db.query(`SELECT DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d') as date, COUNT(*) as count FROM direct_leads GROUP BY date LIMIT 5`);
    console.log(rows);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
