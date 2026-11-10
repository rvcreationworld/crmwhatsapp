const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('SELECT CAST(call_started_at AS CHAR) as raw_time FROM callpulse_call_logs ORDER BY id DESC LIMIT 5');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
