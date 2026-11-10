const db = require('./backend/config/db');
(async () => {
  const [rows] = await db.query('SELECT call_started_at FROM callpulse_call_logs LIMIT 1');
  console.log("From DB:", rows[0]?.call_started_at);
  console.log("DB Value as JS Date string:", rows[0]?.call_started_at?.toString());
  process.exit(0);
})();
