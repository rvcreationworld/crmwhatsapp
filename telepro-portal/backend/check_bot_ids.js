const db = require('./config/db');

async function check() {
  const [logs] = await db.query("SELECT * FROM callpulse_call_logs WHERE lead_type='BOT' LIMIT 5");
  console.log("BOT logs:", logs);
  
  if (logs.length > 0) {
    const [lead] = await db.query("SELECT * FROM working_sheet WHERE id=?", [logs[0].lead_id]);
    console.log("Matching working_sheet lead:", lead[0] ? "Found" : "Not Found", lead[0]);
  }
  process.exit(0);
}
check();
