const db = require('./config/db');
async function test() {
  const [rows] = await db.query("SHOW COLUMNS FROM free_leads");
  console.log(rows.map(r => r.Field));
  process.exit(0);
}
test();
