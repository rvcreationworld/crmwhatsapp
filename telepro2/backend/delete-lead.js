const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const number = process.argv[2];
  if (!number) {
    console.log("Provide number");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });

  console.log(`Deleting lead ${number}`);
  
  await conn.execute("DELETE FROM direct_leads WHERE mobile_number = ? OR mobile_number LIKE ?", [number, `%${number}%`]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM bot_leads WHERE phone = ? OR phone LIKE ?", [number, `%${number}%`]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM new_leads WHERE phone_number = ? OR phone_number LIKE ?", [number, `%${number}%`]).catch(e=>console.log(e.message));
  
  await conn.execute("DELETE FROM whatsapp_conversations WHERE phone_number = ? OR normalized_number = ?", [number, number]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_inbound_messages WHERE from_number = ?", [number]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_outbound_messages WHERE to_number = ?", [number]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_automation_queue WHERE phone_number = ? OR normalized_number = ?", [number, number]).catch(e=>console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_recurring_broadcast_recipients WHERE phone_number = ?", [number]).catch(e=>console.log(e.message));
  
  console.log("Deletion complete.");
  await conn.end();
}
run();
