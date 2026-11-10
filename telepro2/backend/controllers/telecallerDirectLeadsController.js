const db = require('../config/db');
const { getStatusLockState, isEmptyStatus } = require('../utils/statusLockHelper');
const { validateCallPulseStatusRequirement } = require('../utils/callValidation');
const { getStatusLockingEnabled } = require('../utils/settingsHelper');
exports.getFreshDirectLeads = async (req, res) => {
  try {
    console.log("[DirectLeadsFresh] req.user =", req.user);
    console.log("[DirectLeadsFresh] DB_NAME =", process.env.DB_NAME);

    const telecallerId =
      req.user?.telecaller_id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.telecallerId;

    console.log("[DirectLeadsFresh] resolved telecallerId =", telecallerId);

    if (!telecallerId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Telecaller ID missing." });
    }

    const sql = `
      SELECT
        dl.id,
        dl.telecaller_id,
        dl.lead_name,
        dl.lead_contact,
        dl.contact_last10,
        dl.status1,
        dl.status1_remark,
        dl.status1_timestamp,
        dl.status_lock_type,
        dl.is_kyc_done,
        dl.created_at,
        EXISTS (
          SELECT 1
          FROM callpulse_call_logs ccl
          WHERE ccl.telecaller_id = dl.telecaller_id
          AND (
            (ccl.lead_type = 'DIRECT' AND ccl.lead_id = dl.id)
            OR ccl.normalized_number = dl.contact_last10
          )
          LIMIT 1
        ) AS called,
        (
          SELECT MAX(ccl.call_started_at)
          FROM callpulse_call_logs ccl
          WHERE ccl.telecaller_id = dl.telecaller_id
          AND (
            (ccl.lead_type = 'DIRECT' AND ccl.lead_id = dl.id)
            OR ccl.normalized_number = dl.contact_last10
          )
        ) AS last_call_at
      FROM direct_leads dl
      WHERE dl.telecaller_id = ? AND (dl.is_released_to_free_pool = 0 OR dl.is_released_to_free_pool IS NULL) AND (dl.is_closed_lead = 0 OR dl.is_closed_lead IS NULL) AND (dl.is_transferred_lead = 0 OR dl.is_transferred_lead IS NULL)
      AND (dl.is_kyc_done = 0 OR dl.is_kyc_done IS NULL)
      AND (dl.status_lock_type IS NULL OR dl.status_lock_type != 'KYC_DONE')
      AND (
        dl.status1 IS NULL
        OR dl.status1 = ''
        OR dl.status1 = 'None'
        OR dl.status1 = 'Select'
      )
      ORDER BY dl.created_at DESC, dl.id DESC
      LIMIT 100;
    `;

    const [rows] = await db.query(sql, [telecallerId]);

    const mappedLeads = rows.map(l => ({
      ...l,
      called: !!l.called,
      status1_locked: false,
      status1_lock_reason: null
    }));

    console.log("[DirectLeadsFresh] count =", mappedLeads.length);
    if (mappedLeads.length > 0) {
      console.log("[DirectLeadsFresh] first lead =", mappedLeads[0]);
    }

    res.json({
      success: true,
      count: mappedLeads.length,
      leads: mappedLeads
    });
  } catch (error) {
    console.error("[DirectLeadsFresh] ERROR:", error);
    console.error("[DirectLeadsFresh] SQL message:", error.sqlMessage);
    console.error("[DirectLeadsFresh] SQL:", error.sql);
    return res.status(500).json({
      success: false,
      message: "Server error fetching direct leads",
      error: error.sqlMessage || error.message
    });
  }
};

exports.updateStatus1 = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const leadId = req.params.id;
    const { status1, status1_remark } = req.body;

    if (!leadId || !status1) {
      return res.status(400).json({ success: false, message: "Lead ID and Status 1 are required." });
    }

    const [existing] = await db.query(
      "SELECT id, lead_contact, contact_last10, status_lock_type, is_kyc_done, status1_timestamp, status1 FROM direct_leads WHERE id = ? AND telecaller_id = ?",
      [leadId, telecallerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found or unauthorized." });
    }

    const leadData = existing[0];

    const lockEnabled = await getStatusLockingEnabled();

    if (lockEnabled) {
      // Check locks
      if (leadData.is_kyc_done === 1 || leadData.status_lock_type === 'KYC_DONE') {
        return res.status(400).json({ success: false, message: "This lead is KYC Done and cannot be edited." });
      }
      
      // We can use getStatusLockState from utils/statusLockHelper
      const lockState = getStatusLockState(leadData, lockEnabled);
      if (!lockState.can_edit_status1) {
        return res.status(400).json({ success: false, message: lockState.status1_lock_reason || "Status 1 is locked after midnight. You can no longer edit it." });
      }
    }


    // New CallPulse validation
    const cpVal = await validateCallPulseStatusRequirement({
      telecallerId: req.user.id,
      leadId: parseInt(leadId, 10),
      leadType: 'DIRECT',
      leadContact: leadData.lead_contact,
      contactLast10: leadData.contact_last10,
      statusValue: status1
    });
    if (!cpVal.allowed) {
      return res.status(400).json({ success: false, message: cpVal.reason });
    }

    const timestampSql = (!leadData.status1_timestamp || isEmptyStatus(leadData.status1)) ? "NOW()" : "status1_timestamp";

    await db.query(
      `UPDATE direct_leads 
       SET status1 = ?, status1_remark = ?, status1_timestamp = ${timestampSql}
       WHERE id = ?`,
      [status1, status1_remark || null, leadId]
    );

    res.json({
      success: true,
      message: "Status 1 updated successfully!"
    });
  } catch (err) {
    console.error("Error updating direct lead Status 1:", err);
    res.status(500).json({ success: false, message: "Server error updating Status 1" });
  }
};
