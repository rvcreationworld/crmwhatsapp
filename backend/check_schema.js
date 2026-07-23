const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('SHOW CREATE TABLE callpulse_call_logs');
    console.log(rows[0]['Create Table']);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
