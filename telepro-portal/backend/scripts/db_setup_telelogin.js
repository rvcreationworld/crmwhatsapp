const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const db = require("../config/db");

async function runSetup() {
  try {
    console.log("Creating admin_telelogin_logs table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_telelogin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        admin_username VARCHAR(100) NULL,
        telecaller_id INT NOT NULL,
        telecaller_name VARCHAR(100) NULL,
        tele_mobile VARCHAR(15) NULL,
        login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(100) NULL,
        user_agent TEXT NULL,
        INDEX idx_telelogin_admin_id (admin_id),
        INDEX idx_telelogin_telecaller_id (telecaller_id),
        INDEX idx_telelogin_login_at (login_at)
      );
    `);
    console.log("✅ admin_telelogin_logs created or already exists.");

    console.log("Creating index idx_tm_active_deleted...");
    try {
      await db.query(`
        CREATE INDEX idx_tm_active_deleted 
        ON telecaller_master(is_active, is_deleted);
      `);
      console.log("✅ Index idx_tm_active_deleted created.");
    } catch (idxError) {
      if (idxError.code === 'ER_DUP_KEYNAME') {
        console.log("⚠️ Index idx_tm_active_deleted already exists. Ignoring.");
      } else {
        throw idxError;
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up DB:", error);
    process.exit(1);
  }
}

runSetup();
