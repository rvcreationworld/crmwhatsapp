require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log("Connecting to Database...");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'crm_user',
    password: process.env.DB_PASS || 'crm_password',
    database: process.env.DB_NAME || 'crm_db'
  });

  try {
    console.log("Altering telecaller_campaigns table...");
    
    // Check if columns already exist before adding
    const [columns] = await db.query("SHOW COLUMNS FROM telecaller_campaigns");
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('last_synced_at')) {
      await db.query(`ALTER TABLE telecaller_campaigns ADD COLUMN last_synced_at DATETIME NULL`);
    }
    if (!columnNames.includes('last_imported_row')) {
      await db.query(`ALTER TABLE telecaller_campaigns ADD COLUMN last_imported_row INT DEFAULT 0`);
    }
    if (!columnNames.includes('sync_status')) {
      await db.query(`ALTER TABLE telecaller_campaigns ADD COLUMN sync_status VARCHAR(50) DEFAULT 'IDLE'`);
    }
    if (!columnNames.includes('sync_error')) {
      await db.query(`ALTER TABLE telecaller_campaigns ADD COLUMN sync_error TEXT NULL`);
    }

    console.log("Migration Complete!");
  } catch (error) {
    console.error("Migration Failed:", error);
  } finally {
    await db.end();
  }
}

migrate();
