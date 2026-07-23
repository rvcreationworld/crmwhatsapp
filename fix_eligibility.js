const fs = require('fs');
let file = fs.readFileSync('backend/services/botQueueProcessor.js', 'utf8');

const targetQuery = `SELECT * FROM working_sheet 
       WHERE telecaller_id = ? AND (source = 'BOT_POOL' OR lead_type = 'BOT') AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
       ORDER BY id DESC LIMIT 1`;

const replacementQuery = `SELECT * FROM working_sheet 
       WHERE telecaller_id = ? AND (source = 'BOT_POOL' OR lead_type = 'BOT') AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
       AND (is_closed_lead = 0 OR is_closed_lead IS NULL) 
       AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
       AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
       ORDER BY id DESC LIMIT 1`;

file = file.replace(targetQuery, replacementQuery);
fs.writeFileSync('backend/services/botQueueProcessor.js', file);
console.log('Fixed eligibility query');
