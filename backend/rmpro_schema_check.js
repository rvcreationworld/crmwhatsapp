const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '82.25.108.74', user: 'shareMaster', password: 'Share@2025', database: 'rm_pro'
  });
  
  try {
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables:");
    console.log(tables);

    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      console.log(`\nSchema for ${tableName}:`);
      const [columns] = await conn.query(`DESCRIBE ${tableName}`);
      console.log(columns.map(c => `${c.Field} (${c.Type}) - Null: ${c.Null}, Default: ${c.Default}`));
    }
  } catch(e) {
    console.log("Error:", e.message);
  }

  await conn.end();
}
run();
