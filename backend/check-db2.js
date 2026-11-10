require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const num = '8668332739';
    console.log("Checking working_sheet...");
    const [ws] = await db.query("SELECT id, telecaller_id, lead_name, lead_contact, is_kyc_done FROM working_sheet WHERE contact_last10 = ? OR lead_contact LIKE ?", [num, `%${num}%`]);
    console.log(ws);

    console.log("Checking direct_leads...");
    const [dl] = await db.query("SELECT id, telecaller_id, lead_name, lead_contact, is_kyc_done FROM direct_leads WHERE contact_last10 = ? OR lead_contact LIKE ?", [num, `%${num}%`]);
    console.log(dl);

    console.log("Checking dhan_clients...");
    const [dhan] = await db.query("SELECT * FROM dhan_clients WHERE mobile LIKE ?", [`%${num}%`]);
    console.log(dhan);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
