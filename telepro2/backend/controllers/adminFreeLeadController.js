const db = require('../config/db');
const freeLeadService = require('../services/freeLeadService');
const xlsx = require('xlsx');

exports.scanAndMoveLeads = async (req, res) => {
  try {
    const result = await freeLeadService.releaseStaleLeadsToFreePool();
    res.json(result);
  } catch (error) {
    console.error("scanAndMoveLeads error:", error);
    res.status(500).json({ success: false, message: "Error scanning and moving free leads" });
  }
};

exports.getFreeLeads = async (req, res) => {
  try {
    const { status, source } = req.query;
    
    let query = `
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name,
             ct.telecaller_name AS current_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      LEFT JOIN telecaller_master ct ON fl.current_telecaller_id = ct.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (status && status !== 'All') {
      query += ` AND fl.free_status = ?`;
      queryParams.push(status);
    }

    if (source && source !== 'All') {
      if (source === 'Auto 30 Days') {
         query += ` AND (fl.import_source = 'AUTO_30_DAYS' OR fl.import_source IS NULL)`;
      } else if (source === 'Bulk Upload') {
         query += ` AND fl.import_source = 'BULK_UPLOAD'`;
      }
    }

    query += ` ORDER BY fl.moved_to_free_at DESC`;

    const [leads] = await db.query(query, queryParams);

    res.json({ success: true, leads });
  } catch (error) {
    console.error("getFreeLeads error:", error);
    res.status(500).json({ success: false, message: "Error fetching free leads" });
  }
};

exports.getBulkUploadBatches = async (req, res) => {
  try {
    const [batches] = await db.query(`
      SELECT b.*, t.telecaller_name as uploaded_by_name 
      FROM free_lead_bulk_upload_batches b
      LEFT JOIN telecaller_master t ON b.uploaded_by_admin_id = t.id
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, batches });
  } catch (error) {
    console.error("getBulkUploadBatches error:", error);
    res.status(500).json({ success: false, message: "Error fetching batches" });
  }
};

exports.bulkUploadLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const adminId = req.user.id;
    const fileName = req.file.originalname;

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let importedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    const [existingRows] = await db.query(`
      SELECT contact_last10 FROM free_leads 
      WHERE free_status IN ('AVAILABLE', 'ASSIGNED') AND contact_last10 IS NOT NULL
    `);
    const existingSet = new Set(existingRows.map(r => r.contact_last10));

    const validRowsToInsert = [];

    for (const row of data) {
      const nameKey = Object.keys(row).find(k => 
        ['lead_name', 'name', 'full_name', 'lead name'].includes(k.toLowerCase())
      );
      const contactKey = Object.keys(row).find(k => 
        ['lead_contact', 'phone', 'mobile', 'mobile_no', 'phone_number', 'lead contact'].includes(k.toLowerCase())
      );

      const leadName = nameKey ? String(row[nameKey]).trim() : '';
      const leadContact = contactKey ? String(row[contactKey]).trim() : '';

      if (!leadContact) {
        skippedCount++;
        continue;
      }

      const digits = leadContact.replace(/[^0-9]/g, '');
      if (digits.length < 10) {
        skippedCount++;
        continue;
      }
      const contactLast10 = digits.slice(-10);

      if (existingSet.has(contactLast10)) {
        duplicateCount++;
        continue;
      }

      validRowsToInsert.push({
        lead_name: leadName || 'Unknown',
        lead_contact: leadContact,
        contact_last10: contactLast10
      });
      existingSet.add(contactLast10);
    }

    if (validRowsToInsert.length === 0) {
      return res.json({
        success: true,
        message: "No valid rows found to import.",
        summary: { total: data.length, imported: 0, duplicates: duplicateCount, skipped: skippedCount }
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [batchResult] = await connection.query(`
        INSERT INTO free_lead_bulk_upload_batches 
        (file_name, total_rows, imported_count, duplicate_count, skipped_count, uploaded_by_admin_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [fileName, data.length, validRowsToInsert.length, duplicateCount, skippedCount, adminId]);
      
      const batchId = batchResult.insertId;

      const insertData = validRowsToInsert.map(r => [
        'bulk_upload', null, r.lead_name, r.lead_contact, r.contact_last10,
        null, null, 'BULK_FREE_UPLOAD', 'BULK_UPLOAD', batchId, fileName,
        'AVAILABLE', 0, null, null, 0, null, null
      ]);

      const valueStrings = validRowsToInsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
      const flatValues = insertData.flat();
      
      await connection.query(`
        INSERT INTO free_leads (
          original_table, original_lead_id, lead_name, lead_contact, contact_last10,
          previous_telecaller_id, current_telecaller_id, source, import_source, bulk_upload_batch_id, bulk_upload_file_name,
          free_status, is_closed_lead, closed_lead_at, closed_lead_id, is_transferred_lead, transferred_lead_at, transferred_lead_id,
          original_created_at, moved_to_free_at
        ) VALUES ${valueStrings}
      `, flatValues);

      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully imported ${validRowsToInsert.length} leads.`,
        summary: { total: data.length, imported: validRowsToInsert.length, duplicates: duplicateCount, skipped: skippedCount }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("bulkUploadLeads error:", error);
    res.status(500).json({ success: false, message: "Error uploading bulk free leads" });
  }
};

exports.getFreeLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [leads] = await db.query(`
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name,
             ct.telecaller_name AS current_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      LEFT JOIN telecaller_master ct ON fl.current_telecaller_id = ct.id
      WHERE fl.id = ?
    `, [id]);

    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Free lead not found" });
    }

    const lead = leads[0];

    const [status4History] = await db.query(`
      SELECT fh.*, tm.telecaller_name
      FROM free_lead_history fh
      LEFT JOIN telecaller_master tm ON fh.telecaller_id = tm.id
      WHERE fh.free_lead_id = ? AND fh.action_type = 'STATUS4_UPDATED'
      ORDER BY fh.created_at DESC
    `, [id]);

    // Fetch CallPulse Call Logs
    const [callLogs] = await db.query(`
      SELECT * FROM callpulse_call_logs
      WHERE (lead_type = 'FREE' AND lead_id = ?)
         OR (normalized_number = ? AND telecaller_id = ?)
      ORDER BY call_started_at DESC
    `, [id, lead.contact_last10, lead.current_telecaller_id]);

    res.json({
      success: true,
      lead: lead,
      status4History,
      callLogs
    });
  } catch (error) {
    console.error("getFreeLeadDetails error:", error);
    res.status(500).json({ success: false, message: "Error fetching free lead details" });
  }
};
