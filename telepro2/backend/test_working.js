const db = require('./config/db');
db.query("SELECT * FROM working_sheet WHERE contact_last10='9000041163'").then(res => { console.log(res[0]); process.exit(); });
