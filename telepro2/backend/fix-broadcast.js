const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  // Wipe tracking records for this crashed run
  await conn.execute("DELETE FROM whatsapp_recurring_broadcast_recipients WHERE execution_key = 'broadcast:1:2026-07-18'");
  
  // Also wipe any half-inserted items from the queue for this run just in case
  await conn.execute("DELETE FROM whatsapp_automation_queue WHERE event_key LIKE 'broadcast:1:2026-07-18:%'");
  
  // Reset the broadcast's execution time so it gets picked up immediately again
  await conn.execute("UPDATE whatsapp_recurring_broadcasts SET last_execution_datetime = NULL, execution_status = 'IDLE' WHERE id = 1");

  console.log("Broadcast 1 reset successfully.");
  await conn.end();
}
run();
