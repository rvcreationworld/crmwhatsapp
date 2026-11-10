const db = require('./config/db');

async function run() {
  try {
    const [admins] = await db.query("SELECT id, username, role FROM admin_users");
    console.log("Admins in DB:", admins);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();
