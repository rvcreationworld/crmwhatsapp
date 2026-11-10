const db = require('./config/db');

async function run() {
  try {
    console.log("Updating direct_leads...");
    await db.execute("UPDATE direct_leads SET status3 = 'Int Angel' WHERE status3 = 'Int - Angel'");
    await db.execute("UPDATE direct_leads SET status3 = 'Think&LMK' WHERE status3 = 'Think & LMK'");
    
    console.log("Updating working_sheet...");
    await db.execute("UPDATE working_sheet SET status3 = 'Int Angel' WHERE status3 = 'Int - Angel'");
    await db.execute("UPDATE working_sheet SET status3 = 'Think&LMK' WHERE status3 = 'Think & LMK'");
    
    console.log('DB Updated Successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
