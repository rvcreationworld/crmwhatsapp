const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });
  
  console.log("Backfilling media_urls...");
  const [automations] = await conn.execute("SELECT id, media_library_id FROM whatsapp_automation_messages WHERE media_library_id IS NOT NULL AND media_url IS NULL");
  
  for (const auto of automations) {
      const [media] = await conn.execute("SELECT public_url FROM whatsapp_media_library WHERE id = ?", [auto.media_library_id]);
      if (media.length > 0) {
          await conn.execute("UPDATE whatsapp_automation_messages SET media_url = ? WHERE id = ?", [media[0].public_url, auto.id]);
          console.log(`Updated rule ${auto.id} with URL ${media[0].public_url}`);
      }
  }
  
  console.log("Done.");
  await conn.end();
}
run();
