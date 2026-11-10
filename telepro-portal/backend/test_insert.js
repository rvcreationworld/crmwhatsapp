const db = require('./config/db');
const bcrypt = require('bcrypt');

async function test() {
  try {
    const password_hash = await bcrypt.hash('password123', 10);
    const [result] = await db.query(
      "INSERT INTO telecaller_master (telecaller_name, tele_mobile, password_hash, is_active, own_campaign_enabled, is_deleted) VALUES (?, ?, ?, ?, ?, 0)",
      ['TestUser', '9999999999', password_hash, 1, 0]
    );
    console.log("Success:", result);
  } catch (error) {
    console.error("SQL Error:", error);
  } finally {
    process.exit();
  }
}
test();
