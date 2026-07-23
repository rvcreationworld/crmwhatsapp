const db = require("../config/db");
const { getStatusLockState, isEmptyStatus } = require("../utils/statusLockHelper");
const { validateCallPulseStatusRequirement } = require("../utils/callValidation");
const { getStatusLockingEnabled } = require("../utils/settingsHelper");

exports.getDirectLeads = async (req, res) => {
  // ... existing code ...
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const timeBlock = req.query.timeBlock || null;
    const { applyTimeBlockFilter } = require("../utils/dateFilters");
    
    // Telecallers only see their own direct leads, admins can see all if they hit this, but mostly for telecallers
    const telecallerId = req.user.role === 'TELECALLER' ? req.user.id : req.query.telecaller_id;

    const callStatsJoin = `
      LEFT JOIN (
        SELECT
          telecaller_id,
          normalized_number,
          COUNT(*) AS total_calls
        FROM callpulse_call_logs
        GROUP BY telecaller_id, normalized_number
      ) call_stats
        ON call_stats.telecaller_id = d.telecaller_id
       AND call_stats.normalized_number = d.contact_last10
    `;

    const selectCols = `
      d.*, c.campaign_name,
      COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      CASE
        WHEN COALESCE(call_stats.total_calls, 0) > 0 THEN 'CONNECTED'
        ELSE 'NOT_CALLED'
      END AS call_dot_type
    `;

    let query = `
      SELECT ${selectCols} 
      FROM direct_leads d
      LEFT JOIN telecaller_campaigns c ON d.campaign_id = c.id
      ${callStatsJoin}
      WHERE 1=1
    `;
    let params = [];

    if (telecallerId) {
      query += ` AND d.telecaller_id = ?`;
      params.push(telecallerId);
    }

    if (search) {
      query += ` AND (d.lead_name LIKE ? OR d.lead_contact LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (timeBlock) {
      const filtered = applyTimeBlockFilter(query, params, timeBlock, 'd.created_at');
      query = filtered.query;
      params = filtered.params;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0].total;

    // Fetch paginated
    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(query, params);

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Get direct leads error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status1, status1_remark, status2, status2_remark, status3, status3_remark } = req.body;
    
    // Verify ownership and get old row
    const [leads] = await db.query("SELECT * FROM direct_leads WHERE id = ?", [id]);
    if (leads.length === 0) return res.status(404).json({ message: "Lead not found" });
    const oldLead = leads[0];

    const lockEnabled = await getStatusLockingEnabled();
    const lockState = getStatusLockState(oldLead, lockEnabled);
    const isUpdatingStatus1 = (status1 !== undefined && status1 !== oldLead.status1);
    const isUpdatingStatus2 = (status2 !== undefined && status2 !== oldLead.status2);

    if (lockEnabled) {
      if (oldLead.is_kyc_done === 1 || oldLead.status_lock_type === 'KYC_DONE') {
        return res.status(400).json({ success: false, message: "This lead is KYC Done and cannot be edited." });
      }

      if (isUpdatingStatus1 && !lockState.can_edit_status1) {
        return res.status(400).json({ success: false, message: lockState.status1_lock_reason || "Status 1 is locked after midnight. You can no longer edit it." });
      }
      if (isUpdatingStatus2 && !lockState.can_edit_status2) {
        return res.status(400).json({ success: false, message: lockState.status2_lock_reason || "Status 2 is locked after midnight. You can no longer edit it." });
      }
    }

    if (req.user.role === 'TELECALLER' && oldLead.telecaller_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check call validation for Telecaller
    if (req.user.role === 'TELECALLER') {


      // New CallPulse validation
      const statusesToValidate = [status1, status2, status3].filter(s => s !== undefined);
      for (const st of statusesToValidate) {
        const cpVal = await validateCallPulseStatusRequirement({
          telecallerId: req.user.id,
          leadId: parseInt(id, 10),
          leadType: 'DIRECT',
          leadContact: oldLead.lead_contact,
          contactLast10: oldLead.contact_last10,
          statusValue: st
        });
        if (!cpVal.allowed) {
          return res.status(400).json({ success: false, message: cpVal.reason });
        }
      }
    }

    // Update dynamically what is provided
    let updates = [];
    let params = [];

    if (isUpdatingStatus1 && oldLead.status_lock_type !== 'UNDER_US' && lockState.can_edit_status1) { 
      updates.push("status1 = ?"); 
      params.push(status1); 
      if (!oldLead.status1_timestamp || isEmptyStatus(oldLead.status1)) {
        updates.push("status1_timestamp = NOW()");
      }
    }
    if (status1_remark !== undefined && oldLead.status_lock_type !== 'UNDER_US' && lockState.can_edit_status1) { 
      updates.push("status1_remark = ?"); 
      params.push(status1_remark); 
    }
    
    if (isUpdatingStatus2 && lockState.can_edit_status2) { 
      updates.push("status2 = ?"); 
      params.push(status2); 
      if (!oldLead.status2_timestamp || isEmptyStatus(oldLead.status2)) {
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
      params.push(id);
      
      console.log("[DIRECT_LEADS_WRITE]", {
        functionName: "updateStatus_directLeadsController",
        leadId: id,
        contact: oldLead.lead_contact,
        incomingStatus1: status1,
        incomingStatus2: status2,
        incomingStatus3: status3
      });

      await db.query(`UPDATE direct_leads SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Return the full updated row
    const [updatedLeads] = await db.query(`
      SELECT 
        id, telecaller_id, campaign_id, lead_name, lead_contact, contact_last10,
        status1, status1_remark, status1_timestamp,
        status2, status2_remark, status2_timestamp,
        status3, status3_remark, source, is_closed, created_at, updated_at
      FROM direct_leads 
      WHERE id = ? AND telecaller_id = ?
    `, [id, oldLead.telecaller_id]);

    res.json(updatedLeads[0]);
  } catch (error) {
    console.error("Update direct lead status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
