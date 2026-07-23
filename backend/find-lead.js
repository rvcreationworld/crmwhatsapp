const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const number = process.argv[2] || '7507227964';
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'crmpro_v2_whatsapp_test'
  });

  const [tables] = await conn.execute("SHOW TABLES");
  
  for (let i = 0; i < tables.length; i++) {
    const tableName = Object.values(tables[i])[0];
    const [columns] = await conn.execute(`DESCRIBE ${tableName}`);
    
    for (const col of columns) {
      if (col.Type.includes('varchar') || col.Type.includes('text') || col.Type.includes('longtext') || col.Type.includes('json') || col.Type.includes('char')) {
        try {
          const [results] = await conn.execute(`SELECT * FROM ${tableName} WHERE \`${col.Field}\` LIKE ? LIMIT 1`, [`%${number}%`]);
          if (results.length > 0) {
            console.log(`Found in table: ${tableName}, column: ${col.Field}`);
          }
        } catch(e) {}
      }
    }
  }
  
  await conn.end();
}
run();
