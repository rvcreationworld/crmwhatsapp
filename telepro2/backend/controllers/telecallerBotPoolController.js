const db = require('../config/db');
const { checkEligibility, assignLeadToTelecaller } = require('../services/botQueueProcessor');
const { getStatusLockState, isEmptyStatus } = require('../utils/statusLockHelper');
const { validateCallPulseStatusRequirement } = require('../utils/callValidation');
const { getStatusLockingEnabled } = require('../utils/settingsHelper');
const moment = require('moment-timezone');

exports.getStatus = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    // 1. Get available count from new_leads
    const [countRes] = await db.query("SELECT COUNT(*) as cnt FROM new_leads");
    const availableCount = countRes[0].cnt;

    // 2. Check queue status
    const [queueRes] = await db.query(
      `SELECT status, queued_at FROM bot_lead_fetch_queue WHERE telecaller_id = ? AND status = 'WAITING'`,
      [telecallerId]
    );

    let queuePosition = null;
    if (queueRes.length > 0) {
      // Calculate queue number based on queued_at ASC
      const [posRes] = await db.query(
        `SELECT COUNT(*) + 1 as pos FROM bot_lead_fetch_queue WHERE status = 'WAITING' AND queued_at < ?`,
        [queueRes[0].queued_at]
      );
      queuePosition = posRes[0].pos;
    }

    // 3. Check eligibility
    const eligibility = await checkEligibility(telecallerId);
    
    if (eligibility.isPaused) {
      return res.status(403).json({ success: false, message: eligibility.message, isPaused: true });
    }

    // 4. Get latest assigned lead if status1 is pending
    const [latestRes] = await db.query(
      `SELECT * FROM working_sheet 
       WHERE telecaller_id = ? AND source = 'BOT_POOL' AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
       AND (is_closed_lead = 0 OR is_closed_lead IS NULL) 
       AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
       AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
       ORDER BY id DESC LIMIT 1`,
      [telecallerId]
    );
    let latestAssignedLead = null;
    if (latestRes.length > 0) {
      const l = latestRes[0];
      if (!l.status1 || String(l.status1).trim() === '' || String(l.status1).trim() === 'None') {
        latestAssignedLead = l;
      }
    }

    if (latestAssignedLead) {
      latestAssignedLead = {
        ...latestAssignedLead,
        ...getStatusLockState(latestAssignedLead)
      };
    }
    if (eligibility.blockingLead) {
      eligibility.blockingLead = {
        ...eligibility.blockingLead,
        ...getStatusLockState(eligibility.blockingLead)
      };
    }

    const responseObject = {
      success: true,
      available_count: availableCount,
      queue_position: queuePosition,
      is_eligible_for_fetch: eligibility.eligible,
      blocking_lead: eligibility.blockingLead,
      latest_assigned_lead: latestAssignedLead,
      message: eligibility.message || null
    };

    console.log('[BotPoolStatus] telecaller_id:', req.user?.id || req.user?.telecaller_id);
    console.log('[BotPoolStatus] available_count:', availableCount);
    console.log('[BotPoolStatus] response:', responseObject);
    console.log('[DB]', process.env.DB_NAME);

    res.json(responseObject);
  } catch (err) {
    console.error("Error in getStatus:", err);
    res.status(500).json({ success: false, message: "Server error checking bot pool status" });
  }
};

exports.fetchLead = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    // 1. Check eligibility
    const eligibility = await checkEligibility(telecallerId);
    if (!eligibility.eligible) {
      if (eligibility.isPaused) {
        return res.status(403).json({
          success: false,
          message: eligibility.message
        });
      }
      return res.status(400).json({
        success: false,
        message: eligibility.message || "Please update Status 1 for your current lead before fetching a new lead.",
        blocking_lead: eligibility.blockingLead
      });
    }

    // 2. Try to assign immediately using LIFO
    const assignRes = await assignLeadToTelecaller(telecallerId);

    if (assignRes.assigned) {
      return res.json({
        success: true,
        assigned: true,
        lead: assignRes.lead,
        message: "Lead assigned successfully!"
      });
    }

    // 3. If no lead available, add/update queue to WAITING
    await db.query(
      `INSERT INTO bot_lead_fetch_queue (telecaller_id, status, queued_at, assigned_at, assigned_working_sheet_id)
       VALUES (?, 'WAITING', NOW(), NULL, NULL)
       ON DUPLICATE KEY UPDATE 
       status = 'WAITING', queued_at = NOW(), assigned_at = NULL, assigned_working_sheet_id = NULL`,
      [telecallerId]
    );

    // Calculate queue position
    const [queueRes] = await db.query(
      `SELECT queued_at FROM bot_lead_fetch_queue WHERE telecaller_id = ?`,
      [telecallerId]
    );
    const [posRes] = await db.query(
      `SELECT COUNT(*) + 1 as pos FROM bot_lead_fetch_queue WHERE status = 'WAITING' AND queued_at < ?`,
      [queueRes[0].queued_at]
    );

    res.json({
      success: true,
      assigned: false,
      queued: true,
      queue_position: posRes[0].pos,
      message: "No leads available. You have been added to queue."
    });
  } catch (err) {
    console.error("Error in fetchLead:", err);
    res.status(500).json({ success: false, message: "Server error fetching lead" });
  }
};

exports.updateStatus1 = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { lead_id, status1, status1_remark } = req.body;

    if (!lead_id || !status1) {
      return res.status(400).json({ success: false, message: "Lead ID and Status 1 are required." });
    }

    // Night Chat Validation
    if (status1 === 'Night Chat') {
      const nowInKolkata = moment().tz('Asia/Kolkata');
      const hour = nowInKolkata.hour();
      // Only allowed between 21:00 (9 PM) and 09:00 (9 AM)
      // So NOT allowed if hour is >= 9 AND hour < 21
      if (hour >= 9 && hour < 21) {
        return res.status(400).json({ success: false, message: "Night Chat status can only be selected between 9:00 PM and 9:00 AM." });
      }
    }

    const [existing] = await db.query(
      "SELECT id, lead_contact, contact_last10, status_lock_type, is_kyc_done, status1_timestamp, status1 FROM working_sheet WHERE id = ? AND telecaller_id = ?",
      [lead_id, telecallerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found or unauthorized." });
    }

    const lockEnabled = await getStatusLockingEnabled();

    if (lockEnabled) {
      if (existing[0].is_kyc_done === 1 || existing[0].status_lock_type === 'KYC_DONE') {
        return res.status(400).json({ success: false, message: "This lead is KYC Done and cannot be edited." });
      }
      const lockState = getStatusLockState(existing[0], lockEnabled);
      if (!lockState.can_edit_status1) {
        return res.status(400).json({ success: false, message: lockState.status1_lock_reason || "Status 1 is locked after midnight. You can no longer edit it." });
      }
    }



    // New CallPulse validation
    const cpVal = await validateCallPulseStatusRequirement({
      telecallerId: req.user.id,
      leadId: parseInt(lead_id, 10),
      leadType: 'BOT',
      leadContact: existing[0].lead_contact,
      contactLast10: existing[0].contact_last10,
      statusValue: status1
    });
    if (!cpVal.allowed) {
      return res.status(400).json({ success: false, message: cpVal.reason });
    }

    const timestampSql = (!existing[0].status1_timestamp || isEmptyStatus(existing[0].status1)) ? "NOW()" : "status1_timestamp";

    await db.query(
      `UPDATE working_sheet 
       SET status1 = ?, status1_remark = ?, status1_timestamp = ${timestampSql}, is_active = 1 
       WHERE id = ?`,
      [status1, status1_remark || null, lead_id]
    );

    res.json({
      success: true,
      message: "Status 1 updated successfully!"
    });
  } catch (err) {
    console.error("Error in updateStatus1:", err);
    res.status(500).json({ success: false, message: "Server error updating Status 1" });
  }
};

exports.exitQueue = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    await db.query(
      `UPDATE bot_lead_fetch_queue SET status = 'CANCELLED' WHERE telecaller_id = ? AND status = 'WAITING'`,
      [telecallerId]
    );

    res.json({
      success: true,
      message: "Exited queue successfully."
    });
  } catch (err) {
    console.error("Error in exitQueue:", err);
    res.status(500).json({ success: false, message: "Server error exiting queue" });
  }
};
