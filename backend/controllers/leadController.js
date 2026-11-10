const db = require("../config/db");
const { getStatusLockState, isEmptyStatus } = require("../utils/statusLockHelper");
const { validateCallPulseStatusRequirement } = require("../utils/callValidation");
const { getStatusLockingEnabled } = require("../utils/settingsHelper");

exports.getNewLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [countResult] = await db.query("SELECT COUNT(*) as count FROM new_leads");
    const totalCount = countResult[0].count;

    const [rows] = await db.query(
      "SELECT id, lead_name, lead_contact, created_at FROM new_leads ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("getNewLeads error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getWorkingSheet = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const source = req.query.source || "ALL";
    const timeBlock = req.query.timeBlock || null;
    const { applyTimeBlockFilter } = require("../utils/dateFilters");

    let joinCondition = `call_stats.normalized_number = RIGHT(REGEXP_REPLACE(working_sheet.lead_contact, '[^0-9]', ''), 10)`;

    const callStatsJoin = `
      LEFT JOIN (
        SELECT
          normalized_number,
          SUM(CASE WHEN duration_seconds = 0 THEN 1 ELSE 0 END) AS zero_call_count,
          SUM(CASE WHEN duration_seconds > 0 THEN 1 ELSE 0 END) AS connected_call_count
        FROM callpulse_call_logs
        GROUP BY normalized_number
      ) call_stats
        ON ${joinCondition}
    `;

    let baseQuery = `
      FROM working_sheet
      LEFT JOIN telecaller_master ON working_sheet.telecaller_id = telecaller_master.id
      ${callStatsJoin}
      WHERE 1=1
    `;
    let queryParams = [];

    // If telecaller, restrict to their own leads
    if (req.user.role === "TELECALLER") {
      baseQuery += ` AND working_sheet.telecaller_id = ?`;
      queryParams.push(req.user.id);
    }

    if (search) {
      baseQuery += ` AND (working_sheet.lead_name LIKE ? OR working_sheet.lead_contact LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (source !== "ALL") {
      if (source === "BOT") {
        baseQuery += ` AND (working_sheet.source IS NULL OR working_sheet.source != 'PERSONAL_META_AD')`;
      } else {
        baseQuery += ` AND working_sheet.source = ?`;
        queryParams.push(source);
      }
    }

    if (timeBlock) {
      const filtered = applyTimeBlockFilter(baseQuery, queryParams, timeBlock, 'working_sheet.created_at');
      baseQuery = filtered.query;
      queryParams = filtered.params;
    }

    const [countResult] = await db.query(`SELECT COUNT(*) as count ${baseQuery}`, queryParams);
    const totalCount = countResult[0].count;

    // We only need specific fields to keep it light
    const selectFields = `
      working_sheet.id, working_sheet.lead_name, working_sheet.lead_contact, 
      working_sheet.status1, working_sheet.status1_remark,
      working_sheet.status2, working_sheet.status2_timestamp, working_sheet.status2_remark,
      working_sheet.status3, working_sheet.status3_remark,
      working_sheet.source, working_sheet.created_at,
      telecaller_master.telecaller_name,
      COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      CASE
        WHEN COALESCE(call_stats.total_calls, 0) > 0 THEN 'CONNECTED'
        ELSE 'NOT_CALLED'
      END AS call_dot_type
    `;

    queryParams.push(limit, offset);
    const [rows] = await db.query(
      `SELECT ${selectFields} ${baseQuery} ORDER BY working_sheet.created_at DESC LIMIT ? OFFSET ?`,
      queryParams
    );

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("getWorkingSheet error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.telecallerUpdate = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { status1, status1_remark, status2, status2_remark, status3, status3_remark } = req.body;
    
    let checkQuery = "SELECT telecaller_id, lead_contact, contact_last10, status_lock_type, is_kyc_done, status1, status1_timestamp, status1_remark, status2, status2_timestamp, status2_remark, status3, status3_timestamp FROM working_sheet WHERE id = ?";
    const [lead] = await db.query(checkQuery, [leadId]);

    if (lead.length === 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const lockEnabled = await getStatusLockingEnabled();
    const lockState = getStatusLockState(lead[0], lockEnabled);
    const isUpdatingStatus1 = (status1 !== undefined && status1 !== lead[0].status1);
    const isUpdatingStatus2 = (status2 !== undefined && status2 !== lead[0].status2);

    if (lockEnabled) {
      if (lead[0].is_kyc_done === 1 || lead[0].status_lock_type === 'KYC_DONE') {
        return res.status(400).json({ success: false, message: "This lead is KYC Done and cannot be edited." });
      }

      if (isUpdatingStatus1 && !lockState.can_edit_status1) {
        return res.status(400).json({ success: false, message: lockState.status1_lock_reason || "Status 1 is locked after midnight. You can no longer edit it." });
      }
      if (isUpdatingStatus2 && !lockState.can_edit_status2) {
        return res.status(400).json({ success: false, message: lockState.status2_lock_reason || "Status 2 is locked after midnight. You can no longer edit it." });
      }
    }

    // Role check
    if (req.user.role === "telecaller" || req.user.role === "TELECALLER") {
      if (lead[0].telecaller_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this lead" });
      }

      // New CallPulse validation
      const statusesToValidate = [
        { index: 1, value: status1 },
        { index: 2, value: status2 },
        { index: 3, value: status3 }
      ].filter(s => s.value !== undefined);

      for (const st of statusesToValidate) {
        const cpVal = await validateCallPulseStatusRequirement({
          telecallerId: req.user.id,
          leadId: parseInt(leadId, 10),
          leadType: 'BOT',
          leadContact: lead[0].lead_contact,
          contactLast10: lead[0].contact_last10,
          statusValue: st.value,
          statusIndex: st.index
        });
        if (!cpVal.allowed) {
          return res.status(400).json({ success: false, message: cpVal.reason });
        }
      }
    }

    let updates = [];
    let params = [];

    if (isUpdatingStatus1 && lead[0].status_lock_type !== 'UNDER_US' && lockState.can_edit_status1) { 
      updates.push("status1 = ?"); 
      params.push(status1);
      if (!lead[0].status1_timestamp || isEmptyStatus(lead[0].status1)) {
        updates.push("status1_timestamp = NOW()");
      }
    }
    if (status1_remark !== undefined && lead[0].status_lock_type !== 'UNDER_US' && lockState.can_edit_status1) { 
      updates.push("status1_remark = ?"); 
      params.push(status1_remark); 
    }

    if (isUpdatingStatus2 && lockState.can_edit_status2) { 
      updates.push("status2 = ?"); 
      params.push(status2); 
      if (!lead[0].status2_timestamp || isEmptyStatus(lead[0].status2)) {
        updates.push("status2_timestamp = NOW()");
      }
    }
    if (status2_remark !== undefined && lockState.can_edit_status2) { 
      updates.push("status2_remark = ?"); 
      params.push(status2_remark); 
    }

    if (status3 !== undefined) { updates.push("status3 = ?"); params.push(status3); }
    if (status3_remark !== undefined) { updates.push("status3_remark = ?"); params.push(status3_remark); }

    if (updates.length > 0) {
      params.push(leadId);
      await db.query(`UPDATE working_sheet SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true, message: "Lead updated successfully" });
  } catch (error) {
    console.error("telecallerUpdate error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
