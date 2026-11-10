const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test', multipleStatements: true
    });
    
    const sql = fs.readFileSync('migration_recurring_broadcasts.sql', 'utf8');
    
    // Some indexes might already exist, so let's run them one by one and ignore Duplicate Key errors
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const stmt of statements) {
        try {
            console.log("Executing:", stmt.substring(0, 50) + "...");
            await conn.execute(stmt);
        } catch(e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log("Index already exists, skipping...");
            } else {
                console.error("Error executing statement:", e.message);
            }
        }
    }
    
    console.log("Migration complete.");
    await conn.end();
  } catch(e) {
      console.error(e);
  }
}
run();
