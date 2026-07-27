const db = require('../config/db');
const { validateCallPulseStatusRequirement } = require('../utils/callValidation');

exports.getMyTransferredLeads = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { period } = req.query;

    let dateWhere = "";
    if (period === 'current') {
      dateWhere = " AND YEAR(tl.transferred_at) = YEAR(CURDATE()) AND MONTH(tl.transferred_at) = MONTH(CURDATE())";
    } else if (period === 'past') {
      dateWhere = " AND tl.transferred_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND tl.transferred_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    // Get pending leads (ASSIGNED) and completed leads (COMPLETED)
    const [leads] = await db.query(
      `SELECT tl.*, pt.telecaller_name AS previous_telecaller_name
       FROM transferred_leads tl
       LEFT JOIN telecaller_master pt ON tl.previous_telecaller_id = pt.id
       WHERE tl.current_telecaller_id = ? 
         AND tl.transfer_status IN ('ASSIGNED', 'COMPLETED')
         AND (tl.is_closed_lead = 0 OR tl.is_closed_lead IS NULL)
         AND (tl.is_released_to_free_pool = 0 OR tl.is_released_to_free_pool IS NULL)
         ${dateWhere}
       ORDER BY tl.transferred_at DESC`,
      [telecallerId]
    );

    res.json({ success: true, data: leads });
  } catch (error) {
    console.error("Error fetching transferred leads for telecaller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getTransferredLeadDetails = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { id } = req.params;

    const [leads] = await db.query(
      `SELECT tl.*, pt.telecaller_name AS previous_telecaller_name
       FROM transferred_leads tl
       LEFT JOIN telecaller_master pt ON tl.previous_telecaller_id = pt.id
       WHERE tl.id = ? AND tl.current_telecaller_id = ?`,
      [id, telecallerId]
    );

    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, data: leads[0] });
  } catch (error) {
    console.error("Error fetching transferred lead details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateStatus4 = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const telecallerName = req.user.telecaller_name || req.user.name || 'Telecaller';
    const { id } = req.params;
    const { status4, status4_remark } = req.body;

    if (!status4) {
      return res.status(400).json({ success: false, message: "Status 4 is required" });
    }

    const [leads] = await db.query(`SELECT * FROM transferred_leads WHERE id = ?`, [id]);
    
    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const lead = leads[0];

    if (lead.current_telecaller_id !== telecallerId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this lead" });
    }

    if (lead.transfer_status !== 'ASSIGNED') {
      return res.status(400).json({ success: false, message: "Lead is already completed or not assigned" });
    }

    // CallPulse validation
    let leadType = lead.original_table === 'direct_leads' ? 'DIRECT' : 'BOT';
    const validation = await validateCallPulseStatusRequirement({
      telecallerId,
      leadId: lead.original_lead_id, // Pass original id if needed for logging
      leadType,
      leadContact: lead.lead_contact,
      contactLast10: lead.contact_last10,
      statusValue: status4,
      statusIndex: 4
    });

    if (!validation.allowed) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
        reason: validation.reason
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE transferred_leads 
         SET status4 = ?, status4_remark = ?, status4_timestamp = NOW(), transfer_status = 'COMPLETED' 
         WHERE id = ?`,
        [status4, status4_remark || null, id]
      );

      await connection.query(
        `INSERT INTO transferred_lead_history (
          transferred_lead_id, telecaller_id, telecaller_name, action_type, 
          status4, status4_remark, status4_timestamp, notes, created_at
        ) VALUES (?, ?, ?, 'STATUS4_UPDATED', ?, ?, NOW(), 'Status 4 updated by transferred telecaller', NOW())`,
        [id, telecallerId, telecallerName, status4, status4_remark || null]
      );

      await connection.commit();
      res.json({ success: true, message: "Status 4 updated successfully" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("updateStatus4 error for transferred leads:", error);
    res.status(500).json({ success: false, message: "Error updating status 4" });
  }
};
