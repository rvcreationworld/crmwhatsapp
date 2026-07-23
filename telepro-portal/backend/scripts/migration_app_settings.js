const db = require("../config/db");

async function migrate() {
  try {
    console.log("Creating app_settings table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default sync interval
    const [rows] = await db.query("SELECT * FROM app_settings WHERE setting_key = 'sync_interval'");
    if (rows.length === 0) {
      await db.query("INSERT INTO app_settings (setting_key, setting_value) VALUES ('sync_interval', '4')");
      console.log("Inserted default sync_interval = 4");
    } else {
      console.log("sync_interval already exists.");
    }

    console.log("Migration app_settings completed.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
