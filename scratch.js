const db = require('./backend/config/db');
async function test() {
  const [rows] = await db.query("SELECT created_at FROM new_leads LIMIT 1");
  console.log(rows[0].created_at);
  console.log(typeof rows[0].created_at);
  console.log(rows[0].created_at instanceof Date);
  console.log(JSON.stringify(rows[0].created_at));
  process.exit(0);
}
test();
