const db = require("../config/db");

async function setupDbV2() {
  try {
    console.log("Setting up Database V2 Upgrades...");

    // 1. Add own_campaign_enabled to telecaller_master
    try {
      await db.query(`
        ALTER TABLE telecaller_master 
        ADD COLUMN own_campaign_enabled TINYINT DEFAULT 0
      `);
      console.log("Added own_campaign_enabled to telecaller_master.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("own_campaign_enabled column already exists.");
      } else {
        throw err;
      }
    }

    // 2. Add is_deleted to telecaller_master (Soft Delete)
    try {
      await db.query(`
        ALTER TABLE telecaller_master 
        ADD COLUMN is_deleted TINYINT DEFAULT 0
      `);
      console.log("Added is_deleted to telecaller_master.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("is_deleted column already exists.");
      } else {
        throw err;
      }
    }

    // 3. Add Source to working_sheet if not exists (should be there usually but let's be safe)
    // Actually source is already in working_sheet, just making sure it's accessible.
    // The previous implementation used source. No ALTER needed unless it's missing.
    try {
      await db.query(`
        ALTER TABLE working_sheet 
        ADD COLUMN source VARCHAR(100) DEFAULT NULL
      `);
      console.log("Added source to working_sheet.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("source column already exists in working_sheet.");
      }
    }

    // 4. Create telecaller_campaigns table
    await db.query(`
      CREATE TABLE IF NOT EXISTS telecaller_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telecaller_id INT NOT NULL,
        campaign_name VARCHAR(255) NOT NULL,
        sheet_url VARCHAR(1000) NULL,
        total_imported INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (telecaller_id) REFERENCES telecaller_master(id)
      )
    `);
    console.log("telecaller_campaigns table ensured.");

    console.log("Database V2 setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Database V2 setup failed:", error);
    process.exit(1);
  }
}

setupDbV2();
