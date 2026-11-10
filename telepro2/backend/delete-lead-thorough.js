const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const number = '7507227964';
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });

  console.log(`Thoroughly deleting lead ${number}`);

  // Delete from direct_leads
  await conn.execute("DELETE FROM direct_leads WHERE lead_contact = ? OR contact_last10 = ? OR lead_contact LIKE ?", [number, number, `%${number}%`]).catch(e => console.log(e.message));
  
  // Delete from callpulse_call_logs
  await conn.execute("DELETE FROM callpulse_call_logs WHERE dialed_number = ? OR raw_phone_number = ? OR normalized_number = ?", [number, number, number]).catch(e => console.log(e.message));
  
  // Delete from admin_telelogin_logs
  await conn.execute("DELETE FROM admin_telelogin_logs WHERE tele_mobile = ?", [number]).catch(e => console.log(e.message));

  console.log("Deletion complete.");
  await conn.end();
}
run();
