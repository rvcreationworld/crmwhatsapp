const db = require('../config/db');
const transferLeadService = require('../services/transferLeadService');

exports.getTransferLeads = async (req, res) => {
  try {
    const { tab = 'current_month', telecaller_id = 'all', source_table = 'all', search, page = 1, limit = 50, filter_untouched = 'false' } = req.query;
    const offset = (page - 1) * limit;

    let dateWhereClause = "";
    if (tab === 'current_month') {
      dateWhereClause = "created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')";
    } else {
      dateWhereClause = "created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    const tcWhere = telecaller_id !== 'all' ? `AND telecaller_id = ${db.escape(telecaller_id)}` : "";

    // working_sheet Select
    const wsQuery = `
      SELECT id AS lead_id, 'working_sheet' COLLATE utf8mb4_unicode_ci AS source_table, lead_name COLLATE utf8mb4_unicode_ci AS lead_name, lead_contact COLLATE utf8mb4_unicode_ci AS lead_contact, contact_last10 COLLATE utf8mb4_unicode_ci AS contact_last10, 
             telecaller_id, (SELECT telecaller_name COLLATE utf8mb4_unicode_ci FROM telecaller_master WHERE id = telecaller_id) AS telecaller_name,
             source COLLATE utf8mb4_unicode_ci AS source, created_at, status1 COLLATE utf8mb4_unicode_ci AS status1, status1_remark COLLATE utf8mb4_unicode_ci AS status1_remark, status1_timestamp, status2 COLLATE utf8mb4_unicode_ci AS status2, status2_remark COLLATE utf8mb4_unicode_ci AS status2_remark, status2_timestamp,
             status3 COLLATE utf8mb4_unicode_ci AS status3, status3_remark COLLATE utf8mb4_unicode_ci AS status3_remark, status3_timestamp, CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS status4, CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS status4_remark, CAST(NULL AS DATETIME) AS status4_timestamp,
             GREATEST(COALESCE(status1_timestamp, '1970-01-01'), COALESCE(status2_timestamp, '1970-01-01'), COALESCE(status3_timestamp, '1970-01-01')) as last_status_updated_at
      FROM working_sheet
      WHERE (is_closed_lead = 0 OR is_closed_lead IS NULL)
        AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
        AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
        AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
        AND (status_lock_type IS NULL OR status_lock_type != 'KYC_DONE')
        AND ${dateWhereClause}
        ${tcWhere}
    `;

    // direct_leads Select
    const dlQuery = `
      SELECT id AS lead_id, 'direct_leads' COLLATE utf8mb4_unicode_ci AS source_table, lead_name COLLATE utf8mb4_unicode_ci AS lead_name, lead_contact COLLATE utf8mb4_unicode_ci AS lead_contact, contact_last10 COLLATE utf8mb4_unicode_ci AS contact_last10, 
             telecaller_id, (SELECT telecaller_name COLLATE utf8mb4_unicode_ci FROM telecaller_master WHERE id = telecaller_id) AS telecaller_name,
             source COLLATE utf8mb4_unicode_ci AS source, created_at, status1 COLLATE utf8mb4_unicode_ci AS status1, status1_remark COLLATE utf8mb4_unicode_ci AS status1_remark, status1_timestamp, status2 COLLATE utf8mb4_unicode_ci AS status2, status2_remark COLLATE utf8mb4_unicode_ci AS status2_remark, status2_timestamp,
             status3 COLLATE utf8mb4_unicode_ci AS status3, status3_remark COLLATE utf8mb4_unicode_ci AS status3_remark, status3_timestamp, CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS status4, CAST(NULL AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS status4_remark, CAST(NULL AS DATETIME) AS status4_timestamp,
             GREATEST(COALESCE(status1_timestamp, '1970-01-01'), COALESCE(status2_timestamp, '1970-01-01'), COALESCE(status3_timestamp, '1970-01-01')) as last_status_updated_at
      FROM direct_leads
      WHERE (is_closed_lead = 0 OR is_closed_lead IS NULL)
        AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
        AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
        AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
        AND (status_lock_type IS NULL OR status_lock_type != 'KYC_DONE')
        AND ${dateWhereClause}
        ${tcWhere}
    `;

    // free_leads Select (use current_telecaller_id mapped as telecaller_id for unified logic)
    const flTcWhere = telecaller_id !== 'all' ? `AND current_telecaller_id = ${db.escape(telecaller_id)}` : "";
    let flDateWhereClause = "";
    if (tab === 'current_month') {
      flDateWhereClause = "original_created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND original_created_at < DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')";
    } else {
      flDateWhereClause = "original_created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    const flQuery = `
      SELECT id AS lead_id, 'free_leads' COLLATE utf8mb4_unicode_ci AS source_table, lead_name COLLATE utf8mb4_unicode_ci AS lead_name, lead_contact COLLATE utf8mb4_unicode_ci AS lead_contact, contact_last10 COLLATE utf8mb4_unicode_ci AS contact_last10, 
             current_telecaller_id AS telecaller_id, (SELECT telecaller_name COLLATE utf8mb4_unicode_ci FROM telecaller_master WHERE id = current_telecaller_id) AS telecaller_name,
             source COLLATE utf8mb4_unicode_ci AS source, original_created_at AS created_at, status1 COLLATE utf8mb4_unicode_ci AS status1, status1_remark COLLATE utf8mb4_unicode_ci AS status1_remark, status1_timestamp, status2 COLLATE utf8mb4_unicode_ci AS status2, status2_remark COLLATE utf8mb4_unicode_ci AS status2_remark, status2_timestamp,
             status3 COLLATE utf8mb4_unicode_ci AS status3, status3_remark COLLATE utf8mb4_unicode_ci AS status3_remark, status3_timestamp, status4 COLLATE utf8mb4_unicode_ci AS status4, status4_remark COLLATE utf8mb4_unicode_ci AS status4_remark, status4_timestamp,
             GREATEST(COALESCE(status1_timestamp, '1970-01-01'), COALESCE(status2_timestamp, '1970-01-01'), COALESCE(status3_timestamp, '1970-01-01'), COALESCE(status4_timestamp, '1970-01-01')) as last_status_updated_at
      FROM free_leads
      WHERE (is_closed_lead = 0 OR is_closed_lead IS NULL)
        AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
        AND free_status IN ('ASSIGNED', 'COMPLETED')
        AND ${flDateWhereClause}
        ${flTcWhere}
    `;

    // Combine queries based on source_table filter
    const queriesToUnion = [];
    if (source_table === 'all' || source_table === 'working_sheet') queriesToUnion.push(wsQuery);
    if (source_table === 'all' || source_table === 'direct_leads') queriesToUnion.push(dlQuery);
    if (source_table === 'all' || source_table === 'free_leads') queriesToUnion.push(flQuery);

    if (queriesToUnion.length === 0) {
      return res.json({ success: true, data: [], totalCount: 0, totalPages: 0, currentPage: parseInt(page) });
    }

    const unionSql = queriesToUnion.join(" UNION ALL ");

    let outerWhere = "1=1";
    const outerParams = [];

    if (search) {
      const searchTerm = `%${search}%`;
      outerWhere += ` AND (lead_name LIKE ? OR lead_contact LIKE ? OR contact_last10 LIKE ? OR telecaller_name LIKE ?)`;
      outerParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filter_untouched === 'true') {
      outerWhere += ` AND (status1 IS NULL OR status1 = '') AND NOT EXISTS (
        SELECT 1 FROM callpulse_call_logs ccl 
        WHERE ccl.telecaller_id = combined.telecaller_id 
        AND (
          ccl.normalized_number = combined.contact_last10
          OR ccl.normalized_number = RIGHT(combined.lead_contact, 10)
          OR (ccl.lead_id = combined.lead_id AND ccl.lead_type = (
             CASE 
               WHEN combined.source_table = 'working_sheet' THEN 'WORKING_SHEET'
               WHEN combined.source_table = 'direct_leads' THEN 'DIRECT'
               WHEN combined.source_table = 'free_leads' THEN 'FREE'
             END
          ))
        )
      )`;
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${unionSql}) AS combined WHERE ${outerWhere}`;
    const mainQuery = `SELECT * FROM (${unionSql}) AS combined WHERE ${outerWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const [countResult] = await db.query(countQuery, outerParams);
    const totalCount = countResult[0].total;

    const mainParams = [...outerParams, parseInt(limit), parseInt(offset)];
    const [rows] = await db.query(mainQuery, mainParams);

    // Get call log summaries for the returned leads
    for (let row of rows) {
      if (row.telecaller_id && row.contact_last10) {
        const [callLogs] = await db.query(
          `SELECT COUNT(*) as call_count, SUM(duration_seconds) as total_duration_seconds 
           FROM callpulse_call_logs 
           WHERE telecaller_id = ? AND normalized_number = ?`,
          [row.telecaller_id, row.contact_last10]
        );
        if (callLogs.length > 0) {
          row.call_count = callLogs[0].call_count || 0;
          row.total_duration_seconds = callLogs[0].total_duration_seconds || 0;
        } else {
          row.call_count = 0;
          row.total_duration_seconds = 0;
        }
      } else {
        row.call_count = 0;
        row.total_duration_seconds = 0;
      }
      
      row.is_untouched = (row.call_count === 0) && (!row.status1 || String(row.status1).trim() === '');
    }

    res.json({
      success: true,
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Error fetching transfer leads:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getLeadDetails = async (req, res) => {
  try {
    const { sourceTable, leadId } = req.params;
    if (!['working_sheet', 'direct_leads', 'free_leads'].includes(sourceTable)) {
      return res.status(400).json({ success: false, message: "Invalid source table" });
    }

    let query = `SELECT *, (SELECT telecaller_name COLLATE utf8mb4_unicode_ci FROM telecaller_master WHERE id = telecaller_id) AS telecaller_name FROM ?? WHERE id = ?`;
    let queryParams = [sourceTable, leadId];

    if (sourceTable === 'free_leads') {
      query = `SELECT *, (SELECT telecaller_name COLLATE utf8mb4_unicode_ci FROM telecaller_master WHERE id = current_telecaller_id) AS telecaller_name FROM ?? WHERE id = ?`;
    }

    const [rows] = await db.query(query, queryParams);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = rows[0];

    const tcId = sourceTable === 'free_leads' ? lead.current_telecaller_id : lead.telecaller_id;

    // Fetch call logs
    const [callLogs] = await db.query(
      `SELECT call_started_at, duration_seconds, call_type, sync_status 
       FROM callpulse_call_logs 
       WHERE telecaller_id = ? AND normalized_number = ?
       ORDER BY call_started_at DESC`,
      [tcId, lead.contact_last10]
    );

    lead.callLogs = callLogs;

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error("Error fetching lead details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.transfer = async (req, res) => {
  try {
    const { target_telecaller_id, transfer_reason, leads } = req.body;
    const adminId = req.admin ? req.admin.id : null; // Assuming authMiddleware puts admin on req

    if (!target_telecaller_id || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid request payload" });
    }

    const result = await transferLeadService.transferLeads(leads, target_telecaller_id, transfer_reason, adminId);
    res.json(result);
  } catch (error) {
    console.error("Error in transfer operation:", error);
    res.status(500).json({ success: false, message: "Internal server error during transfer" });
  }
};
