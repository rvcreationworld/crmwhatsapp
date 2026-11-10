require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function migratePasswords() {
  console.log("Starting password migration...");
  try {
    const [telecallers] = await db.query("SELECT id, password_hash, tele_mobile, phone_last10 FROM telecaller_master");
    
    let updatedCount = 0;
    
    for (const t of telecallers) {
      let needsUpdate = false;
      let newHash = t.password_hash;
      let newPhoneLast10 = t.phone_last10;

      // 1. Populate phone_last10 if missing
      if (!t.phone_last10 && t.tele_mobile) {
        const digitsOnly = t.tele_mobile.replace(/\D/g, '');
        newPhoneLast10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
        needsUpdate = true;
      }

      // 2. Fix password hashes
      // Note: We don't have password_visible in this schema.
      // If password_hash exists but is not bcrypt, hash it.
      if (t.password_hash) {
        const hashStr = String(t.password_hash);
        if (!hashStr.startsWith("$2a$") && !hashStr.startsWith("$2b$") && !hashStr.startsWith("$2y$")) {
          console.log(`Migrating raw password for telecaller ID ${t.id}`);
          newHash = await bcrypt.hash(hashStr, 10);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await db.query(
          "UPDATE telecaller_master SET password_hash = ?, phone_last10 = ? WHERE id = ?",
          [newHash, newPhoneLast10, t.id]
        );
        updatedCount++;
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} telecallers.`);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit();
  }
}

migratePasswords();
