require('dotenv').config({ path: './.env' });
const db = require('./config/db');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

async function extractSheetId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function test() {
  const [campaigns] = await db.query("SELECT * FROM common_campaigns LIMIT 1");
  const campaign = campaigns[0];
  const sheetId = await extractSheetId(campaign.sheet_url);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${Date.now()}`;
  
  const response = await axios.get(csvUrl, { responseType: 'text' });
  const records = parse(response.data, { columns: true, skip_empty_lines: true, trim: true });
  
  console.log("Found records:", records.length);
  
  let newLeadsCount = 0;
  for (const rawRow of records) {
    const row = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      row[normalizedKey] = value;
    }
    
    const rawContact = row['phonenumber'] || row['phone'] || row['contact'] || row['mobile'] || row['mobilenumber'] || row['contactnumber'] || row['phoneno'];
    if (!rawContact) continue;
    
    const digitsOnly = String(rawContact).replace(/[^0-9]/g, '');
    const leadContact = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    
    const [existingNew] = await db.query("SELECT id FROM new_leads WHERE lead_contact LIKE ?", [`%${leadContact}%`]);
    const [existingWorking] = await db.query("SELECT id FROM working_sheet WHERE contact_last10 = ?", [leadContact]);
    
    if (existingNew.length === 0 && existingWorking.length === 0) {
      newLeadsCount++;
    }
  }
  
  console.log("Would insert NEW leads:", newLeadsCount);
  process.exit();
}
test();
