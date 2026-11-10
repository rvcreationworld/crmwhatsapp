const db = require("../config/db");
const bcrypt = require("bcrypt");

async function setupDb() {
  try {
    console.log("Setting up database...");

    // Create admin_users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("admin_users table ensured.");

    // Add password_hash to telecaller_master if not exists
    try {
      await db.query(`
        ALTER TABLE telecaller_master 
        ADD COLUMN password_hash VARCHAR(255) NULL
      `);
      console.log("Added password_hash to telecaller_master.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("password_hash column already exists in telecaller_master.");
      } else {
        throw err;
      }
    }

    // Insert default admin if not exists
    const [admins] = await db.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (admins.length === 0) {
      const defaultPasswordHash = await bcrypt.hash("admin123", 10);
      await db.query("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", [
        "admin",
        defaultPasswordHash,
      ]);
      console.log("Default admin created (username: admin, password: admin123).");
    } else {
      console.log("Default admin already exists.");
    }

    // Indexes
    try {
      await db.query(`ALTER TABLE working_sheet ADD INDEX idx_telecaller_id (telecaller_id)`);
      console.log("Index on telecaller_id created.");
    } catch (e) {
      if (e.code !== "ER_DUP_KEYNAME") console.error("Error creating index idx_telecaller_id:", e.message);
    }

    try {
      await db.query(`ALTER TABLE working_sheet ADD INDEX idx_created_at (created_at)`);
      console.log("Index on created_at created.");
    } catch (e) {
      if (e.code !== "ER_DUP_KEYNAME") console.error("Error creating index idx_created_at:", e.message);
    }

    try {
      await db.query(`ALTER TABLE telecaller_master ADD INDEX idx_tele_mobile (tele_mobile)`);
      console.log("Index on tele_mobile created.");
    } catch (e) {
      if (e.code !== "ER_DUP_KEYNAME") console.error("Error creating index idx_tele_mobile:", e.message);
    }

    console.log("Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  }
}

setupDb();
