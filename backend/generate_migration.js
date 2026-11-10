const mysql = require('mysql2/promise');
const fs = require('fs');

async function generateSql() {
  const connection = await mysql.createConnection({
    host: '82.25.108.74',
    user: 'shareMaster',
    password: 'Share@2025'
  });

  const tables = [
    'admin_telelogin_logs', 'admin_users', 'app_settings', 'bot_lead_fetch_queue', 'bulk_upload_batches', 'bulk_upload_results', 'callpulse_agents', 'callpulse_call_logs', 'callpulse_call_logs_backup_before_device_id_fix', 'closed_leads', 'common_campaign_imports', 'common_campaigns', 'dashboard_greeting_views', 'dashboard_greetings', 'direct_leads', 'free_lead_bulk_upload_batches', 'free_lead_fetch_queue', 'free_lead_history', 'free_leads', 'lead_classification_events', 'lead_status_history', 'new_leads', 'not_interested_followup_actions', 'not_interested_followup_campaigns', 'not_interested_followup_logs', 'old_leads', 'system_state', 'telecaller_attendance', 'telecaller_daily_verification', 'telecaller_queue', 'transferred_lead_history', 'transferred_leads', 'whatsapp_templates', 'working_sheet', 'telecaller_master', 'telecaller_campaigns'
  ];

  let sql = 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

  // TRUNCATES
  for (const t of tables) {
    sql += `TRUNCATE TABLE crmpro_v2_whatsapp_test.${t};\n`;
  }
  sql += '\n';

  // INSERTS
  for (const t of tables) {
    // Get non-generated columns for this table in crmpro_v2
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME, EXTRA 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'crmpro_v2' 
      AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [t]);

    const validCols = cols.filter(c => !c.EXTRA.toUpperCase().includes('GENERATED')).map(c => '`' + c.COLUMN_NAME + '`');
    const colStr = validCols.join(', ');

    sql += `INSERT INTO crmpro_v2_whatsapp_test.${t} (${colStr})\n`;
    sql += `SELECT ${colStr} FROM crmpro_v2.${t};\n\n`;
  }

  sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';

  fs.writeFileSync('/Users/aniket/Downloads/crmwhatsapp/migrate_data.sql', sql);
  await connection.end();
  console.log('Migration script generated safely avoiding generated columns.');
}

generateSql().catch(console.error);
