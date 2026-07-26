require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function checkDb() {
  try {
    const q = `DESCRIBE working_sheet;`;
    const [ws] = await db.query(q);
    console.log(ws.map(w => w.Field).filter(f => f.includes('date') || f.includes('time') || f === 'updated_at' || f === 'created_at'));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkDb();
