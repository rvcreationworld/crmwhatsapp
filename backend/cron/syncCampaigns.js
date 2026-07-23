const cron = require('node-cron');
const db = require('../config/db');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { processBotLeadQueue } = require('../services/botQueueProcessor');
const { enqueueDirectLeadWelcome, enqueueBotLeadWelcome } = require('../services/whatsappQueueProcessor');
const { assignChatToAgent } = require('../services/interaktAssignmentService');
const { syncLeadTraits } = require('../services/interaktTraitSyncService');
const { convertSheetTimestampToIstMysql } = require('../utils/dateFilters');

// Move extractSheetId to a shared utility or just duplicate it here for the cron context
function extractSheetId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

const syncCampaign = async (campaign) => {
  let fetchedRows = 0;
  let insertedRows = 0;
  let skippedDuplicates = 0;

  try {
    console.log(`[Cron] Starting sync for Campaign ID: ${campaign.id}`);
    
    await db.query(`UPDATE telecaller_campaigns SET sync_status = 'SYNCING', sync_error = NULL WHERE id = ?`, [campaign.id]);

    // **CRITICAL CHECK**: Ensure the telecaller actually has the feature toggled ON
    const [telecallerRows] = await db.query("SELECT own_campaign_enabled FROM telecaller_master WHERE id = ?", [campaign.telecaller_id]);
    if (telecallerRows.length === 0 || telecallerRows[0].own_campaign_enabled !== 1) {
      throw new Error("Sync blocked: Personal Meta Campaign Leads toggle is currently OFF for this telecaller.");
    }

    const sheetId = extractSheetId(campaign.sheet_url);
    if (!sheetId) throw new Error("Invalid Google Sheet link");

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${Date.now()}`;
    
    console.log(`[Cron] Campaign ID: ${campaign.id} | Telecaller ID: ${campaign.telecaller_id} | Sheet CSV URL: ${csvUrl}`);
    console.log(`[Cron] Campaign ID: ${campaign.id} | last_imported_row before sync: ${campaign.last_imported_row || 0}`);

    let csvData;
    try {
      const response = await axios.get(csvUrl, { 
        responseType: 'text',
        timeout: 15000, // 15 second timeout to prevent frozen syncs
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      csvData = response.data;
    } catch (err) {
      throw new Error(`Failed to fetch Google Sheet: ${err.message}`);
    }

    let records;
    try {
      records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    } catch (err) {
      throw new Error(`CSV Parse Error: ${err.message}`);
    }

    fetchedRows = records.length;
    console.log(`[Cron] Campaign ID: ${campaign.id} | Total rows fetched: ${fetchedRows}`);

    if (fetchedRows === 0) {
      throw new Error("The Google Sheet is empty");
    }

    const headersDetected = Object.keys(records[0]);
    console.log(`[Cron] Campaign ID: ${campaign.id} | Header names detected: ${headersDetected.join(', ')}`);

    let updatedRows = 0;

    for (const rawRow of records) {
      // Normalize keys
      const row = {};
      for (const [key, value] of Object.entries(rawRow)) {
        // Strip out all spaces and underscores to make matching foolproof
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        row[normalizedKey] = value;
      }

      // Check against normalized keys (no spaces, no underscores)
      const rawContact = row['phonenumber'] || row['phone'] || row['contact'] || row['mobile'] || row['mobilenumber'] || row['contactnumber'];
      if (!rawContact) continue;

      // Extract only digits and take the last 10 digits (reading from right to left)
      const digitsOnly = String(rawContact).replace(/[^0-9]/g, '');
      const leadContact = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const contactLast10 = leadContact; // Both will be the same 10-digit number
      
      const rawName = row['firstname'] || row['name'] || row['leadname'] || row['fullname'] || row['customername'];
      const leadName = rawName ? String(rawName).trim() : "Unknown";
      
      const rawTime = row['createdtime'] || row['createdat'] || row['timestamp'] || row['date'] || row['time'];
      let createdAt = convertSheetTimestampToIstMysql(rawTime);
      if (!createdAt) {
        // Fallback to current IST time if parsing fails or missing
        createdAt = convertSheetTimestampToIstMysql(new Date().toISOString());
      }
      
      // Temporary logs requested by user
      console.log('[CampaignTime] raw:', rawTime);
      console.log('[CampaignTime] ist:', createdAt);

      // Cross-check with BOT leads (working_sheet)
      const [botExisting] = await db.query(
        "SELECT id FROM working_sheet WHERE telecaller_id = ? AND contact_last10 = ?",
        [campaign.telecaller_id, contactLast10]
      );

      if (botExisting.length > 0) {
        // Skip direct lead insert because it already exists as a BOT lead
        skippedDuplicates++;
        continue;
      }

      console.log("[DIRECT_LEADS_WRITE]", {
        functionName: "syncCampaigns_UPSERT",
        leadId: null,
        contact: leadContact,
        incomingStatus1: undefined,
        incomingStatus2: undefined,
        incomingStatus3: undefined
      });

      const [result] = await db.query(
        `INSERT INTO direct_leads 
         (telecaller_id, campaign_id, lead_name, lead_contact, contact_last10, source, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'PERSONAL_META_AD', ?, NOW())
         ON DUPLICATE KEY UPDATE
         lead_name = VALUES(lead_name),
         lead_contact = VALUES(lead_contact),
         contact_last10 = VALUES(contact_last10),
         campaign_id = VALUES(campaign_id),
         source = VALUES(source),
         updated_at = NOW()`,
        [campaign.telecaller_id, campaign.id, leadName, leadContact, contactLast10, createdAt]
      );

      if (result.insertId && result.affectedRows === 1) {
        insertedRows++;
        console.log(`[Cron] New direct lead detected (ID: ${result.insertId})`);
        
        // Enqueue WhatsApp Welcome Message asynchronously
        enqueueDirectLeadWelcome({
          leadId: result.insertId,
          telecallerId: campaign.telecaller_id,
          leadName: leadName,
          phoneNumber: leadContact
        }).catch(err => {
          console.error(`[Cron] WhatsApp enqueue failed for lead ${result.insertId}. Sync continues... Error:`, err.message);
        });

        // Asynchronously trigger Interakt Chat Assignment (new API without wc_id)
        assignChatToAgent(leadContact, campaign.telecaller_id).catch(console.error);

        // Asynchronously sync Lead Traits (Name & RM) to Interakt
        syncLeadTraits(leadContact, leadName, campaign.telecaller_id).catch(console.error);

      } else {
        updatedRows++;
      }
    }

    console.log(`[Cron] Campaign ID: ${campaign.id} | New rows detected: ${insertedRows}`);
    console.log(`[Cron] Campaign ID: ${campaign.id} | Duplicate rows updated: ${updatedRows}`);
    console.log(`[Cron] Campaign ID: ${campaign.id} | Skipped rows: ${skippedDuplicates}`);
    console.log(`[Cron] Campaign ID: ${campaign.id} | last_imported_row after sync: ${fetchedRows}`);

    // Update campaign
    await db.query(
      `UPDATE telecaller_campaigns 
       SET last_imported_row = ?, total_imported = total_imported + ?, sync_status = 'SUCCESS', last_synced_at = NOW(), sync_error = NULL 
       WHERE id = ?`,
      [fetchedRows, insertedRows, campaign.id]
    );

    console.log(`[Cron] Sync complete for Campaign ID: ${campaign.id}. Imported: ${insertedRows}, Updated: ${updatedRows}`);

    return {
      success: true,
      fetchedRows,
      insertedRows,
      updatedRows,
      skippedDuplicates,
      message: `Sync completed: ${insertedRows} new leads imported, ${updatedRows} duplicates overwritten.`
    };

  } catch (err) {
    console.error(`[Cron] Sync failed for Campaign ID: ${campaign.id} | Error: ${err.message}`);
    await db.query(
      `UPDATE telecaller_campaigns SET sync_status = 'ERROR', sync_error = ?, last_synced_at = NOW() WHERE id = ?`,
      [err.message, campaign.id]
    );
    return {
      success: false,
      fetchedRows,
      insertedRows,
      updatedRows: 0,
      skippedDuplicates,
      message: err.message
    };
  }
};

let isGlobalSyncRunning = false;

const runAutoSync = async () => {
  if (isGlobalSyncRunning) {
    console.log("[Cron] Sync is already in progress, skipping this interval to prevent overlap.");
    return;
  }
  
  isGlobalSyncRunning = true;
  try {
    const [campaigns] = await db.query(`
      SELECT c.* 
      FROM telecaller_campaigns c
      JOIN telecaller_master t ON c.telecaller_id = t.id
      WHERE c.sheet_url IS NOT NULL 
        AND c.is_active = 1 
        AND c.auto_sync = 1
        AND t.own_campaign_enabled = 1 
        AND t.is_active = 1 
        AND t.is_deleted = 0
    `);
    if (campaigns.length === 0) return;

    console.log(`[Cron] Running auto-sync for ${campaigns.length} campaigns...`);
    
    // Process in chunks of 20 to handle 500+ campaigns efficiently
    const chunkSize = 20;
    for (let i = 0; i < campaigns.length; i += chunkSize) {
      const chunk = campaigns.slice(i, i + chunkSize);
      console.log(`[Cron] Processing batch ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(campaigns.length/chunkSize)} (${chunk.length} campaigns)`);
      
      const promises = chunk.map(campaign => syncCampaign(campaign));
      await Promise.allSettled(promises);
    }
    
    console.log(`[Cron] All campaign batches processed successfully.`);
  } catch (err) {
    console.error("[Cron] Auto-sync global error:", err);
  } finally {
    isGlobalSyncRunning = false;
  }
};

const syncCommonCampaign = async (campaign, syncType = 'AUTO') => {
  let fetchedRows = 0;
  let insertedRows = 0;
  let skippedRows = 0;

  try {
    console.log(`[Cron Common] Starting sync for Common Campaign ID: ${campaign.id} | Type: ${syncType}`);
    
    await db.query(`UPDATE common_campaigns SET sync_status = 'SYNCING', sync_error = NULL WHERE id = ?`, [campaign.id]);

    const sheetId = extractSheetId(campaign.sheet_url);
    if (!sheetId) throw new Error("Invalid Google Sheet link");

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${Date.now()}`;
    
    let csvData;
    try {
      const response = await axios.get(csvUrl, { 
        responseType: 'text',
        timeout: 15000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      csvData = response.data;
    } catch (err) {
      throw new Error(`Failed to fetch Google Sheet: ${err.message}`);
    }

    let records;
    try {
      records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    } catch (err) {
      throw new Error(`CSV Parse Error: ${err.message}`);
    }

    fetchedRows = records.length;
    console.log(`[Cron Common] Total rows fetched: ${fetchedRows}`);

    if (fetchedRows === 0) {
      throw new Error("The Google Sheet is empty");
    }

    // Pre-fetch all existing bot pool contacts to avoid duplicates
    const [existingImports] = await db.query("SELECT contact_last10 FROM common_campaign_imports WHERE campaign_id = ?", [campaign.id]);
    const [existingNew] = await db.query("SELECT lead_contact FROM new_leads");
    const [existingWorking] = await db.query("SELECT contact_last10 FROM working_sheet WHERE source = 'BOT_POOL' OR lead_type = 'BOT'");
    
    const existingContacts = new Set([
      ...existingImports.map(r => r.contact_last10),
      ...existingNew.map(r => r.lead_contact),
      ...existingWorking.map(r => r.contact_last10)
    ].filter(Boolean));

    let highestRow = campaign.last_imported_row || 0;

    for (let i = 0; i < records.length; i++) {
      const sourceRowNumber = i + 1;
      
      const rawRow = records[i];
      const row = {};
      for (const [key, value] of Object.entries(rawRow)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        row[normalizedKey] = value;
      }

      const rawName = row['firstname'] || row['name'] || row['leadname'] || row['fullname'] || row['customername'];
      const rawContact = row['phonenumber'] || row['phone'] || row['contact'] || row['mobile'] || row['mobilenumber'] || row['contactnumber'] || row['phoneno'];
      const rawTime = row['createdtime'] || row['createdat'] || row['timestamp'] || row['date'] || row['time'] || Object.values(rawRow)[0]; // fallback to first column for time

      if (!rawName) {
        skippedRows++;
        continue;
      }
      
      let leadName = String(rawName).trim();
      
      if (!rawContact) {
        skippedRows++;
        continue;
      }

      // Clean phone number: remove 'p:', keep only digits, get last 10
      let digitsOnly = String(rawContact).replace(/p:/gi, '').replace(/[^0-9]/g, '');
      if (digitsOnly.length === 0) {
        skippedRows++;
        continue;
      }
      
      const leadContact = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      
      if (existingContacts.has(leadContact)) {
        skippedRows++;
        continue;
      }

      // Parse date and convert to IST string
      let createdAt = convertSheetTimestampToIstMysql(rawTime);
      if (!createdAt) {
        createdAt = convertSheetTimestampToIstMysql(new Date().toISOString());
      }
      
      console.log('[CampaignTime] raw:', rawTime);
      console.log('[CampaignTime] ist:', createdAt);

      // Insert into new_leads
      const [insertResult] = await db.query(
        `INSERT INTO new_leads (lead_name, lead_contact, created_at) VALUES (?, ?, ?)`,
        [leadName, leadContact, createdAt]
      );

      const insertedLeadId = insertResult.insertId;

      enqueueBotLeadWelcome({
        leadId: insertedLeadId,
        leadTable: 'new_leads',
        telecallerId: null,
        leadName: leadName,
        phoneNumber: leadContact
      }).catch(error => {
        console.error(
          `[Cron] BOT WhatsApp enqueue failed for lead ${insertedLeadId}. Import continues:`,
          error.message
        );
      });

      // Insert into common_campaign_imports
      await db.query(
        `INSERT INTO common_campaign_imports 
         (campaign_id, source_row_number, full_name, phone_no, contact_last10, sheet_created_time, imported_lead_id, sync_type, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [campaign.id, sourceRowNumber, leadName, rawContact, leadContact, createdAt, insertedLeadId, syncType]
      );

      existingContacts.add(leadContact); // Prevent duplicates in the same sheet
      insertedRows++;
      if (sourceRowNumber > highestRow) {
        highestRow = sourceRowNumber;
      }
    }

    console.log(`[Cron Common] Sync complete. Imported: ${insertedRows}, Skipped: ${skippedRows}`);

    if (highestRow > (campaign.last_imported_row || 0)) {
      await db.query(
        `UPDATE common_campaigns 
         SET last_imported_row = ?, total_imported = total_imported + ?, sync_status = 'SUCCESS', last_synced_at = NOW(), sync_error = NULL 
         WHERE id = ?`,
        [highestRow, insertedRows, campaign.id]
      );
    } else {
      await db.query(
        `UPDATE common_campaigns 
         SET total_imported = total_imported + ?, sync_status = 'SUCCESS', last_synced_at = NOW(), sync_error = NULL 
         WHERE id = ?`,
        [insertedRows, campaign.id]
      );
    }

    if (insertedRows > 0) {
      console.log(`[Cron Common] New leads imported. Triggering queue processor...`);
      // Run asynchronously or await
      await processBotLeadQueue();
    }

    return {
      success: true,
      fetchedRows,
      insertedRows,
      skippedRows,
      message: `${insertedRows} new leads imported into New Leads / Bot Pool.`
    };

  } catch (err) {
    console.error(`[Cron Common] Sync failed | Error: ${err.message}`);
    await db.query(
      `UPDATE common_campaigns SET sync_status = 'ERROR', sync_error = ?, last_synced_at = NOW() WHERE id = ?`,
      [err.message, campaign.id]
    );
    return {
      success: false,
      fetchedRows,
      insertedRows,
      skippedRows,
      message: err.message
    };
  }
};

const runCommonCampaignAutoSync = async () => {
  try {
    const [campaigns] = await db.query(`
      SELECT * FROM common_campaigns 
      WHERE sheet_url IS NOT NULL 
        AND is_active = 1 
        AND auto_sync_enabled = 1
      LIMIT 1
    `);
    
    if (campaigns.length > 0) {
      console.log(`[Cron Common] Running auto-sync for Common Campaign...`);
      await syncCommonCampaign(campaigns[0], 'AUTO');
    }
  } catch (err) {
    console.error("[Cron Common] Auto-sync global error:", err);
  }
};

let currentCronTask = null;

const initCron = async () => {
  try {
    let intervalSeconds = 240; // default 240 seconds
    
    try {
      const [rows] = await db.query("SELECT setting_value FROM app_settings WHERE setting_key = 'sync_interval'");
      if (rows.length > 0) {
        let dbVal = parseInt(rows[0].setting_value, 10);
        if (!isNaN(dbVal) && dbVal > 0) {
          if (dbVal < 60) {
            intervalSeconds = dbVal * 60; // convert minutes to seconds
          } else {
            intervalSeconds = dbVal; // it's already in seconds
          }
        }
      }
    } catch (err) {
      console.error("[Cron] Failed to fetch sync_interval setting, defaulting to 240s:", err.message);
    }

    if (currentCronTask) {
      clearInterval(currentCronTask);
      console.log("[Cron] Stopped previous interval schedule.");
    }

    const tick = () => {
      runAutoSync();
      runCommonCampaignAutoSync();
    };

    currentCronTask = setInterval(tick, intervalSeconds * 1000);
    
    // Run an initial sync shortly after initialization
    setTimeout(tick, 10000);
    
    console.log(`[Cron] Scheduled Google Sheet auto-sync every ${intervalSeconds} seconds.`);
  } catch (err) {
    console.error("[Cron] Error initializing cron:", err);
  }
};

module.exports = {
  initCron,
  syncCampaign,
  syncCommonCampaign,
  runAutoSync
};
