const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const number = '7507227964';
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });

  console.log(`Deleting remaining lead records for ${number}`);

  await conn.execute("DELETE FROM telecaller_master WHERE tele_mobile = ? OR phone_last10 = ?", [number, number]).catch(e => console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_inbound_messages WHERE from_phone = ? OR normalized_number = ?", [number, number]).catch(e => console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_message_logs WHERE phone_number = ? OR normalized_number = ?", [number, number]).catch(e => console.log(e.message));
  await conn.execute("DELETE FROM whatsapp_message_queue WHERE phone_number = ? OR normalized_number = ?", [number, number]).catch(e => console.log(e.message));
  
  // also wipe the ones we already found but using like
  await conn.execute("DELETE FROM admin_telelogin_logs WHERE tele_mobile LIKE ?", [`%${number}%`]).catch(e => console.log(e.message));

  console.log("Final deletion complete.");
  await conn.end();
}
run();
