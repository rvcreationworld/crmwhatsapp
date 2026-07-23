const db = require('./config/db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.query("UPDATE admin_users SET password_hash = ? WHERE username = 'admin'", [hashedPassword]);
    console.log("Admin password forcefully updated to 'admin123'");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();
