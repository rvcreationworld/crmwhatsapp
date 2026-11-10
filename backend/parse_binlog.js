const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');

async function recover() {
  const fileStream = fs.createReadStream('../binlog_extract.txt');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inDeleteBlock = false;
  let currentRecord = {};
  const deletedRecords = [];
  
  const columns = [
    'id', 'original_table', 'original_lead_id', 'lead_name', 'lead_contact', 'contact_last10', 
    'previous_telecaller_id', 'current_telecaller_id', 'source', 'original_created_at', 
    'status1', 'status1_remark', 'status1_timestamp', 'status2', 'status2_remark', 'status2_timestamp', 
    'status3', 'status3_remark', 'status3_timestamp', 'status4', 'status4_remark', 'status4_timestamp', 
    'transfer_reason', 'transfer_status', 'transferred_by_admin_id', 'transferred_at', 
    'is_closed_lead', 'closed_lead_at', 'closed_lead_id', 'is_released_to_free_pool', 
    'free_released_at', 'free_lead_id', 'created_at', 'updated_at'
  ];

  for await (const line of rl) {
    if (line.includes('DELETE FROM `crmpro_v2_whatsapp_test`.`transferred_leads`')) {
      if (Object.keys(currentRecord).length > 0) {
        if (currentRecord[7] === '254' || currentRecord[8] === '254') {
          deletedRecords.push(currentRecord);
        }
      }
      inDeleteBlock = true;
      currentRecord = {};
    } else if (inDeleteBlock && line.startsWith('###   @')) {
      // Regex updated to optionally match the comment at the end
      const match = line.match(/###   @(\d+)=(.*?)(?: \/\*|$)/);
      if (match) {
        const index = parseInt(match[1]);
        let val = match[2];
        if (val === 'NULL') {
          val = null;
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        currentRecord[index] = val;
      }
    } else if (inDeleteBlock && !line.startsWith('###')) {
      inDeleteBlock = false;
      if (Object.keys(currentRecord).length > 0) {
        if (currentRecord[7] === '254' || currentRecord[8] === '254') {
          deletedRecords.push(currentRecord);
        }
        currentRecord = {};
      }
    }
  }
  
  if (inDeleteBlock && Object.keys(currentRecord).length > 0) {
    if (currentRecord[7] === '254' || currentRecord[8] === '254') {
      deletedRecords.push(currentRecord);
    }
  }

  console.log(`Found ${deletedRecords.length} records to restore.`);
  
  if (deletedRecords.length === 0) return;

  const connection = await mysql.createConnection({
    host: '82.25.108.74',
    user: 'shareMaster',
    password: 'Share@2025',
    database: 'crmpro_v2_whatsapp_test',
    port: 3306
  });

  let restored = 0;
  for (const record of deletedRecords) {
    const keys = [];
    const values = [];
    const placeholders = [];
    
    for (let i = 1; i <= columns.length; i++) {
      if (record[i] !== undefined) {
        keys.push(columns[i - 1]);
        values.push(record[i]);
        placeholders.push('?');
      }
    }
    
    const query = `INSERT IGNORE INTO transferred_leads (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`;
    try {
      await connection.query(query, values);
      restored++;
    } catch (err) {
      console.error('Error inserting ID', record[1], err.message);
    }
  }
  
  console.log(`Successfully restored ${restored} records.`);
  await connection.end();
}

recover().catch(console.error);
