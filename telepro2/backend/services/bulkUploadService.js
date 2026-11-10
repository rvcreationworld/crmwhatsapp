const db = require('../config/db');
const xlsx = require('xlsx');

async function ensureBulkUploadSchema() {
  try {
    // 1. Create bulk_upload_batches table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bulk_upload_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        upload_type ENUM('KYC_DONE','UNDER_US') NOT NULL,
        file_name VARCHAR(255),
        total_rows INT DEFAULT 0,
        matched_count INT DEFAULT 0,
        unmatched_count INT DEFAULT 0,
        uploaded_by_admin_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create bulk_upload_results table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bulk_upload_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        upload_type ENUM('KYC_DONE','UNDER_US') NOT NULL,
        uploaded_mobile VARCHAR(20) NOT NULL,
        contact_last10 VARCHAR(10),
        matched_table ENUM('working_sheet','direct_leads','none') DEFAULT 'none',
        matched_lead_id INT NULL,
        telecaller_id INT NULL,
        result_status ENUM('MATCHED','NOT_FOUND','ALREADY_KYC_DONE','UPDATED','SKIPPED') DEFAULT 'NOT_FOUND',
        message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bulk_batch_id (batch_id),
        INDEX idx_bulk_contact_last10 (contact_last10),
        INDEX idx_bulk_matched_lead (matched_table, matched_lead_id)
      )
    `);

    // 3. Add required columns to working_sheet if missing
    const [wsCols] = await db.query("SHOW COLUMNS FROM working_sheet");
    const wsColNames = wsCols.map(c => c.Field);

    if (!wsColNames.includes("status_lock_type")) {
      await db.query("ALTER TABLE working_sheet ADD COLUMN status_lock_type ENUM('NONE','UNDER_US','KYC_DONE') DEFAULT 'NONE'");
    }
    if (!wsColNames.includes("is_kyc_done")) {
      await db.query("ALTER TABLE working_sheet ADD COLUMN is_kyc_done TINYINT DEFAULT 0");
    }
    if (!wsColNames.includes("kyc_done_at")) {
      await db.query("ALTER TABLE working_sheet ADD COLUMN kyc_done_at DATETIME NULL");
    }
    if (!wsColNames.includes("under_us_at")) {
      await db.query("ALTER TABLE working_sheet ADD COLUMN under_us_at DATETIME NULL");
    }
    if (!wsColNames.includes("bulk_upload_batch_id")) {
      await db.query("ALTER TABLE working_sheet ADD COLUMN bulk_upload_batch_id INT NULL");
    }

    // 4. Add required columns to direct_leads if missing
    const [dlCols] = await db.query("SHOW COLUMNS FROM direct_leads");
    const dlColNames = dlCols.map(c => c.Field);

    if (!dlColNames.includes("status_lock_type")) {
      await db.query("ALTER TABLE direct_leads ADD COLUMN status_lock_type ENUM('NONE','UNDER_US','KYC_DONE') DEFAULT 'NONE'");
    }
    if (!dlColNames.includes("is_kyc_done")) {
      await db.query("ALTER TABLE direct_leads ADD COLUMN is_kyc_done TINYINT DEFAULT 0");
    }
    if (!dlColNames.includes("kyc_done_at")) {
      await db.query("ALTER TABLE direct_leads ADD COLUMN kyc_done_at DATETIME NULL");
    }
    if (!dlColNames.includes("under_us_at")) {
      await db.query("ALTER TABLE direct_leads ADD COLUMN under_us_at DATETIME NULL");
    }
    if (!dlColNames.includes("bulk_upload_batch_id")) {
      await db.query("ALTER TABLE direct_leads ADD COLUMN bulk_upload_batch_id INT NULL");
    }

    // 5. Add index on contact_last10 safely if missing
    const [wsIndexes] = await db.query("SHOW INDEX FROM working_sheet WHERE Key_name = 'idx_working_contact_last10'");
    if (wsIndexes.length === 0) {
      try {
        await db.query("ALTER TABLE working_sheet ADD INDEX idx_working_contact_last10 (contact_last10)");
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') console.log("Note: idx_working_contact_last10 check:", e.message);
      }
    }

    const [dlIndexes] = await db.query("SHOW INDEX FROM direct_leads WHERE Key_name = 'idx_direct_contact_last10'");
    if (dlIndexes.length === 0) {
      try {
        await db.query("ALTER TABLE direct_leads ADD INDEX idx_direct_contact_last10 (contact_last10)");
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') console.log("Note: idx_direct_contact_last10 check:", e.message);
      }
    }

  } catch (error) {
    console.error("Error ensuring bulk upload schema:", error);
    throw error;
  }
}

async function processBulkUpload(fileBuffer, uploadType, fileName, adminId = null) {
  await ensureBulkUploadSchema();

  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  } catch (err) {
    throw new Error("Invalid file format. Please upload a valid CSV, XLSX, or XLS file.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Uploaded file contains no worksheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rows || rows.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  // Extract valid mobile numbers from column 0
  const validMobiles = [];
  const seenMobiles = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row[0] === undefined || row[0] === null) continue;
    
    const rawStr = String(row[0]).trim();
    const digits = rawStr.replace(/\D/g, '');
    
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      // Skip all zeroes or obvious invalid numbers
      if (last10 !== '0000000000' && !seenMobiles.has(last10)) {
        seenMobiles.add(last10);
        validMobiles.push({ raw: rawStr, last10 });
      }
    }
  }

  if (validMobiles.length === 0) {
    throw new Error("No valid 10-digit mobile numbers found in the first column of the uploaded file.");
  }

  // Create batch record
  const [batchRes] = await db.query(
    "INSERT INTO bulk_upload_batches (upload_type, file_name, total_rows, uploaded_by_admin_id) VALUES (?, ?, ?, ?)",
    [uploadType, fileName, validMobiles.length, adminId]
  );
  const batchId = batchRes.insertId;

  let matchedCount = 0;
  let unmatchedCount = 0;
  let updatedCount = 0;
  let alreadyKycCount = 0;

  for (const item of validMobiles) {
    const { raw, last10 } = item;

    // Search in working_sheet
    const [wsMatches] = await db.query(
      `SELECT id, telecaller_id, status_lock_type, is_kyc_done, lead_contact 
       FROM working_sheet 
       WHERE contact_last10 = ? OR lead_contact LIKE ? OR RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10) = ?`,
      [last10, `%${last10}`, last10]
    );

    // Search in direct_leads
    const [dlMatches] = await db.query(
      `SELECT id, telecaller_id, status_lock_type, is_kyc_done, lead_contact 
       FROM direct_leads 
       WHERE contact_last10 = ? OR lead_contact LIKE ? OR RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10) = ?`,
      [last10, `%${last10}`, last10]
    );

    const totalMatches = wsMatches.length + dlMatches.length;

    if (totalMatches === 0) {
      unmatchedCount++;
      await db.query(
        `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, result_status, message)
         VALUES (?, ?, ?, ?, 'none', 'NOT_FOUND', 'Mobile number not found in system')`,
        [batchId, uploadType, raw, last10]
      );
      continue;
    }

    matchedCount++;

    // Process working_sheet matches
    for (const lead of wsMatches) {
      if (uploadType === 'UNDER_US') {
        if (lead.is_kyc_done === 1 || lead.status_lock_type === 'KYC_DONE') {
          alreadyKycCount++;
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'working_sheet', ?, ?, 'ALREADY_KYC_DONE', 'Lead is already KYC Done; skipped Under Us update.')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        } else {
          updatedCount++;
          await db.query(
            `UPDATE working_sheet 
             SET status1 = 'Under Us',
                 status1_timestamp = NOW(),
                 status1_remark = COALESCE(NULLIF(status1_remark, ''), 'Bulk Under Us Upload'),
                 status_lock_type = 'UNDER_US',
                 under_us_at = NOW(),
                 bulk_upload_batch_id = ?
             WHERE id = ?`,
            [batchId, lead.id]
          );
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'working_sheet', ?, ?, 'UPDATED', 'Updated status1 to Under Us (Locked)')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        }
      } else if (uploadType === 'KYC_DONE') {
        if (lead.is_kyc_done === 1 || lead.status_lock_type === 'KYC_DONE') {
          alreadyKycCount++;
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'working_sheet', ?, ?, 'ALREADY_KYC_DONE', 'Lead was already KYC Done; refreshed lock and batch ID.')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        } else {
          updatedCount++;
        }
        
        await db.query(
          `UPDATE working_sheet 
           SET status1 = 'KYC Done',
               status2 = 'KYC Done',
               status3 = 'KYC Done',
               status1_timestamp = COALESCE(status1_timestamp, NOW()),
               status2_timestamp = NOW(),
               status3_timestamp = NOW(),
               status_lock_type = 'KYC_DONE',
               is_kyc_done = 1,
               kyc_done_at = NOW(),
               bulk_upload_batch_id = ?
           WHERE id = ?`,
          [batchId, lead.id]
        );

        if (lead.is_kyc_done !== 1 && lead.status_lock_type !== 'KYC_DONE') {
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'working_sheet', ?, ?, 'UPDATED', 'Updated status1, status2, status3 to KYC Done (Permanently Locked)')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        }
      }
    }

    // Process direct_leads matches
    for (const lead of dlMatches) {
      if (uploadType === 'UNDER_US') {
        if (lead.is_kyc_done === 1 || lead.status_lock_type === 'KYC_DONE') {
          alreadyKycCount++;
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'direct_leads', ?, ?, 'ALREADY_KYC_DONE', 'Lead is already KYC Done; skipped Under Us update.')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        } else {
          updatedCount++;
          await db.query(
            `UPDATE direct_leads 
             SET status1 = 'Under Us',
                 status1_timestamp = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE),
                 status1_remark = COALESCE(NULLIF(status1_remark, ''), 'Bulk Under Us Upload'),
                 status_lock_type = 'UNDER_US',
                 under_us_at = NOW(),
                 bulk_upload_batch_id = ?
             WHERE id = ?`,
            [batchId, lead.id]
          );
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'direct_leads', ?, ?, 'UPDATED', 'Updated status1 to Under Us (Locked)')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        }
      } else if (uploadType === 'KYC_DONE') {
        if (lead.is_kyc_done === 1 || lead.status_lock_type === 'KYC_DONE') {
          alreadyKycCount++;
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'direct_leads', ?, ?, 'ALREADY_KYC_DONE', 'Lead was already KYC Done; refreshed lock and batch ID.')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        } else {
          updatedCount++;
        }

        await db.query(
          `UPDATE direct_leads 
           SET status1 = 'KYC Done',
               status2 = 'KYC Done',
               status3 = 'KYC Done',
               status1_timestamp = COALESCE(status1_timestamp, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE)),
               status2_timestamp = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE),
               status3_timestamp = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE),
               status_lock_type = 'KYC_DONE',
               is_kyc_done = 1,
               kyc_done_at = NOW(),
               bulk_upload_batch_id = ?
           WHERE id = ?`,
          [batchId, lead.id]
        );

        if (lead.is_kyc_done !== 1 && lead.status_lock_type !== 'KYC_DONE') {
          await db.query(
            `INSERT INTO bulk_upload_results (batch_id, upload_type, uploaded_mobile, contact_last10, matched_table, matched_lead_id, telecaller_id, result_status, message)
             VALUES (?, ?, ?, ?, 'direct_leads', ?, ?, 'UPDATED', 'Updated status1, status2, status3 to KYC Done (Permanently Locked)')`,
            [batchId, uploadType, raw, last10, lead.id, lead.telecaller_id]
          );
        }
      }
    }
  }

  // Update batch summary
  await db.query(
    "UPDATE bulk_upload_batches SET matched_count = ?, unmatched_count = ? WHERE id = ?",
    [matchedCount, unmatchedCount, batchId]
  );

  return {
    batchId,
    totalRows: validMobiles.length,
    matchedCount,
    unmatchedCount,
    updatedCount,
    alreadyKycCount
  };
}

module.exports = {
  ensureBulkUploadSchema,
  processBulkUpload
};
