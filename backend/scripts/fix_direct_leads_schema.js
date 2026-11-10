const db = require('../config/db');

async function fix() {
  try {
    console.log("Removing duplicates from direct_leads...");
    await db.query(`
      DELETE t1 FROM direct_leads t1
      INNER JOIN direct_leads t2 
      WHERE t1.id < t2.id 
      AND t1.telecaller_id = t2.telecaller_id 
      AND t1.contact_last10 = t2.contact_last10
    `);
    console.log("Duplicates removed successfully.");

    console.log("Adding unique key uniq_direct_lead_tel_contact...");
    try {
      await db.query("ALTER TABLE direct_leads ADD UNIQUE KEY uniq_direct_lead_tel_contact (telecaller_id, contact_last10)");
      console.log("Unique key added.");
    } catch(e) {
      console.log("Unique key might already exist:", e.message);
    }

    console.log("Adding MySQL trigger trg_direct_leads_preserve_status...");
    await db.query("DROP TRIGGER IF EXISTS trg_direct_leads_preserve_status");
    await db.query(`
      CREATE TRIGGER trg_direct_leads_preserve_status
      BEFORE UPDATE ON direct_leads
      FOR EACH ROW
      BEGIN
        IF OLD.status1 IS NOT NULL AND OLD.status1 != '' AND (NEW.status1 IS NULL OR NEW.status1 = '') THEN
          SET NEW.status1 = OLD.status1;
          SET NEW.status1_remark = OLD.status1_remark;
          SET NEW.status1_timestamp = OLD.status1_timestamp;
        END IF;

        IF OLD.status2 IS NOT NULL AND OLD.status2 != '' AND (NEW.status2 IS NULL OR NEW.status2 = '') THEN
          SET NEW.status2 = OLD.status2;
          SET NEW.status2_remark = OLD.status2_remark;
          SET NEW.status2_timestamp = OLD.status2_timestamp;
        END IF;

        IF OLD.status3 IS NOT NULL AND OLD.status3 != 'New' AND OLD.status3 != 'None' AND OLD.status3 != '' THEN
          IF NEW.status3 IS NULL OR NEW.status3 = 'New' OR NEW.status3 = 'None' OR NEW.status3 = '' THEN
            SET NEW.status3 = OLD.status3;
            SET NEW.status3_remark = OLD.status3_remark;
          END IF;
        END IF;
      END
    `);
    console.log("Trigger added successfully.");
    
    console.log("Database schema fix completed.");
    process.exit(0);
  } catch(e) {
    console.error("Error applying schema fix:", e);
    process.exit(1);
  }
}
fix();
