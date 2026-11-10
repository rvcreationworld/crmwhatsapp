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
    console.log("Creating direct_leads table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS direct_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telecaller_id INT NOT NULL,
        campaign_id INT,
        lead_name VARCHAR(255),
        lead_contact VARCHAR(20) NOT NULL,
        status1 VARCHAR(50),
        status1_remark TEXT,
        status2 VARCHAR(50),
        status2_timestamp DATETIME,
        status2_remark TEXT,
        status3 VARCHAR(50),
        status3_remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (telecaller_id) REFERENCES telecaller_master(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add indexes for searching/filtering
    console.log("Adding indexes...");
    await db.query(`ALTER TABLE direct_leads ADD INDEX idx_direct_lead_contact (lead_contact)`);
    await db.query(`ALTER TABLE direct_leads ADD INDEX idx_direct_telecaller (telecaller_id)`);

    console.log("Migration Complete!");
  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log("Indexes already exist.");
    } else {
      console.error("Migration Failed:", error);
    }
  } finally {
    await db.end();
  }
}

migrate();
