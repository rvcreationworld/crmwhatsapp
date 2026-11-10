const db = require('./config/db');

async function run() {
  try {
    console.log("Querying admins...");
    const [admins] = await db.query("SELECT * FROM admin_users");
    console.log("Found admins:", admins.length);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
