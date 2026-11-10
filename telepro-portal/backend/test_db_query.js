const db = require('./config/db');

async function test() {
  try {
    const [admins] = await db.query("SELECT * FROM admin_users WHERE username = 'CK@2025'");
    console.log(admins);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
