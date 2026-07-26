const mysql = require('mysql2/promise');

async function getTransferredLeads() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: '82.25.108.74',
      user: 'shareMaster',
      password: 'Share@2025',
      database: 'crmpro_v2_whatsapp_test',
      port: 3306
    });

    const [telecallers] = await connection.query(
      "SELECT id, telecaller_name FROM telecaller_master WHERE telecaller_name LIKE '%T16%Diya%Karla%' OR telecaller_name LIKE '%Diya%Karla%'"
    );
    if (telecallers.length === 0) {
      console.log("Telecaller not found");
      process.exit(0);
    }
    const telecallerId = telecallers[0].id;
    console.log("Found telecaller:", telecallers[0].telecaller_name, "ID:", telecallerId);
    
    const [leads] = await connection.query(
      "SELECT COUNT(*) as count FROM transferred_leads WHERE current_telecaller_id = ? AND transfer_status IN ('ASSIGNED', 'COMPLETED')",
      [telecallerId]
    );
    console.log("Transferred leads count:", leads[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

getTransferredLeads();
