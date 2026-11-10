const db = require('../config/db');
const { processBulkUpload, ensureBulkUploadSchema, processDhanKycUpload } = require('../services/bulkUploadService');

exports.uploadKycDone = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await processBulkUpload(
      req.file.buffer,
      'KYC_DONE',
      req.file.originalname,
      req.user?.id || null
    );

    res.json({
      success: true,
      message: "KYC Done bulk upload completed successfully",
      data: result
    });
  } catch (error) {
    console.error("uploadKycDone error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error during KYC Done bulk upload" });
  }
};

exports.uploadUnderUs = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await processBulkUpload(
      req.file.buffer,
      'UNDER_US',
      req.file.originalname,
      req.user?.id || null
    );

    res.json({
      success: true,
      message: "Under Us bulk upload completed successfully",
      data: result
    });
  } catch (error) {
    console.error("uploadUnderUs error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error during Under Us bulk upload" });
  }
};

exports.uploadDhanKyc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await processDhanKycUpload(
      req.file.buffer,
      req.user?.id || null
    );

    res.json({
      success: true,
      message: "Dhan KYC bulk upload completed successfully",
      data: result
    });
  } catch (error) {
    console.error("uploadDhanKyc error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error during Dhan KYC bulk upload" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    await ensureBulkUploadSchema();
    const [rows] = await db.query(`
      SELECT b.*, u.username as admin_username
      FROM bulk_upload_batches b
      LEFT JOIN admin_users u ON b.uploaded_by_admin_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    res.json({ success: true, batches: rows });
  } catch (error) {
    console.error("getHistory error:", error);
    res.status(500).json({ success: false, message: "Server error fetching upload history" });
  }
};

exports.getBatchResults = async (req, res) => {
  try {
    const { batchId } = req.params;
    await ensureBulkUploadSchema();
    const [rows] = await db.query(`
      SELECT r.*, t.telecaller_name as telecaller_name
      FROM bulk_upload_results r
      LEFT JOIN telecaller_master t ON r.telecaller_id = t.id
      WHERE r.batch_id = ?
      ORDER BY r.id ASC
    `, [batchId]);

    res.json({ success: true, results: rows });
  } catch (error) {
    console.error("getBatchResults error:", error);
    res.status(500).json({ success: false, message: "Server error fetching batch results" });
  }
};
