const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('SELECT is_active, COUNT(*) as count FROM working_sheet GROUP BY is_active');
    console.log("Working sheet status counts:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
