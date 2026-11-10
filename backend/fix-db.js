require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function fixDb() {
  try {
    await db.query("ALTER TABLE dhan_clients MODIFY COLUMN pan_number VARCHAR(50) NULL");
    await db.query("ALTER TABLE dhan_clients MODIFY COLUMN kyc_document_path VARCHAR(255) NULL");
    console.log("Successfully altered pan_number and kyc_document_path to allow NULL");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
fixDb();
