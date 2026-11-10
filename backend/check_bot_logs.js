const db = require('./config/db');

async function check() {
  const [bot] = await db.query("SELECT COUNT(*) as count FROM callpulse_call_logs WHERE lead_type='BOT'");
  const [direct] = await db.query("SELECT COUNT(*) as count FROM callpulse_call_logs WHERE lead_type='DIRECT'");
  console.log("BOT logs:", bot[0].count);
  console.log("DIRECT logs:", direct[0].count);
  process.exit(0);
}
check();
