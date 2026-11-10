const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('SELECT is_deleted, COUNT(*) as count FROM working_sheet GROUP BY is_deleted');
    console.log("Working sheet deleted counts:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
