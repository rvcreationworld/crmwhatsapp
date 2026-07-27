const db = require('../config/db');

exports.getFreeLeadsStatus = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    // 1. Available free leads count
    const [availableRows] = await db.query(`SELECT COUNT(id) AS count FROM free_leads WHERE free_status = 'AVAILABLE'`);
    const availableCount = availableRows[0].count;

    // 2. Check if current telecaller has an ASSIGNED lead
    const [assignedLeads] = await db.query(`
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      WHERE fl.current_telecaller_id = ? AND fl.free_status = 'ASSIGNED'
      AND (fl.is_closed_lead = 0 OR fl.is_closed_lead IS NULL) AND (fl.is_transferred_lead = 0 OR fl.is_transferred_lead IS NULL)
    `, [telecallerId]);

    let assignedLead = null;
    let history = [];
    let queuePosition = null;
    let isQueued = false;

    if (assignedLeads.length > 0) {
      assignedLead = assignedLeads[0];
      
      const [historyRows] = await db.query(`
        SELECT * FROM free_lead_history 
        WHERE free_lead_id = ? 
        ORDER BY created_at DESC
      `, [assignedLead.id]);
      history = historyRows;
    } else {
      // Check queue status
      const [queueRes] = await db.query(
        `SELECT queued_at, status FROM free_lead_fetch_queue WHERE telecaller_id = ?`,
        [telecallerId]
      );
      if (queueRes.length > 0 && queueRes[0].status === 'WAITING') {
        isQueued = true;
        const [posRes] = await db.query(
          `SELECT COUNT(*) + 1 as pos FROM free_lead_fetch_queue WHERE status = 'WAITING' AND queued_at < ?`,
          [queueRes[0].queued_at]
        );
        queuePosition = posRes[0].pos;
      }
    }

    res.json({
      success: true,
      availableCount,
      assignedLead,
      history,
      queue_position: queuePosition,
      is_queued: isQueued
    });
  } catch (error) {
    console.error("getFreeLeadsStatus error:", error);
    res.status(500).json({ success: false, message: "Error fetching free leads status" });
  }
};

exports.fetchFreeLead = async (req, res) => {
  const telecallerId = req.user.id;
  const telecallerName = req.user.telecaller_name || req.user.name || 'Telecaller';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if telecaller already has an ASSIGNED lead
    const [existingAssigned] = await connection.query(
      `SELECT id FROM free_leads WHERE current_telecaller_id = ? AND free_status = 'ASSIGNED' AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)`,
      [telecallerId]
    );

    if (existingAssigned.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Please update Status 4 for your current free lead before fetching another." 
      });
    }

    // 2. Upsert queue row to WAITING
    await connection.query(`
      INSERT INTO free_lead_fetch_queue (telecaller_id, status, queued_at, assigned_at, assigned_free_lead_id, last_seen_at, created_at, updated_at)
      VALUES (?, 'WAITING', NOW(), NULL, NULL, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        status = 'WAITING', 
        queued_at = NOW(), 
        assigned_at = NULL, 
        assigned_free_lead_id = NULL, 
        last_seen_at = NOW(),
        updated_at = NOW()
    `, [telecallerId]);

    // 3. Fetch one AVAILABLE lead with row lock
    const [availableLeads] = await connection.query(`
      SELECT * FROM free_leads
      WHERE free_status = 'AVAILABLE' AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      ORDER BY moved_to_free_at ASC, id ASC
      LIMIT 1
      FOR UPDATE
    `);

    if (availableLeads.length === 0) {
      // 4a. No lead found: keep queue as WAITING, calculate position
      await connection.query(`
        UPDATE free_lead_fetch_queue 
        SET status = 'WAITING', last_seen_at = NOW(), updated_at = NOW()
        WHERE telecaller_id = ?
      `, [telecallerId]);

      const [queueRes] = await connection.query(`SELECT queued_at FROM free_lead_fetch_queue WHERE telecaller_id = ?`, [telecallerId]);
      const [posRes] = await connection.query(`SELECT COUNT(*) + 1 as pos FROM free_lead_fetch_queue WHERE status = 'WAITING' AND queued_at < ?`, [queueRes[0].queued_at]);
      
      await connection.commit();
      return res.status(200).json({ 
        success: true, 
        assigned: false,
        queued: true,
        queue_position: posRes[0].pos,
        message: "No free leads available. You have been added to the queue." 
      });
    }

    const freeLead = availableLeads[0];

    // 4b. Assign lead
    await connection.query(
      `UPDATE free_leads SET current_telecaller_id = ?, free_status = 'ASSIGNED', fetched_at = NOW() WHERE id = ?`,
      [telecallerId, freeLead.id]
    );

    // 5. Insert history (FETCHED logic remains valid for all fetched leads)
    await connection.query(
      `INSERT INTO free_lead_history (
        free_lead_id, telecaller_id, telecaller_name, action_type, notes
      ) VALUES (?, ?, ?, 'FETCHED', 'Fetched by telecaller')`,
      [freeLead.id, telecallerId, telecallerName]
    );

    // 6. Update queue to ASSIGNED
    await connection.query(`
      UPDATE free_lead_fetch_queue 
      SET status = 'ASSIGNED', assigned_at = NOW(), assigned_free_lead_id = ?, last_seen_at = NOW(), updated_at = NOW()
      WHERE telecaller_id = ?
    `, [freeLead.id, telecallerId]);

    await connection.commit();
    
    // Return updated status to the client
    res.json({ success: true, message: "Lead fetched successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("fetchFreeLead error:", error);
    res.status(500).json({ success: false, message: "Error fetching free lead" });
  } finally {
    connection.release();
  }
};

exports.updateStatus4 = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const telecallerName = req.user.telecaller_name || req.user.name || 'Telecaller';
    const { id } = req.params;
    const { status4, status4_remark } = req.body;

    const [leads] = await db.query(`SELECT * FROM free_leads WHERE id = ?`, [id]);
    
    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const lead = leads[0];

    if (lead.current_telecaller_id !== telecallerId) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this lead" });
    }

    if (lead.free_status !== 'ASSIGNED' && lead.free_status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: "Lead is not active or assigned to you" });
    }

    if (!status4) {
      return res.status(400).json({ success: false, message: "Status 4 is required" });
    }

    // CallPulse Validation
    const { validateCallPulseStatusRequirement } = require('../utils/callValidation');
    const validation = await validateCallPulseStatusRequirement({
      telecallerId,
      leadId: lead.id,
      leadType: 'FREE',
      leadContact: lead.lead_contact,
      contactLast10: lead.contact_last10,
      statusValue: status4,
      statusIndex: 4
    });

    if (!validation.allowed) {
      return res.status(400).json({ success: false, message: validation.reason });
    }

    // Update lead (allow multiple edits)
    await db.query(
      `UPDATE free_leads 
       SET status4 = ?, status4_remark = ?, status4_timestamp = NOW(), free_status = 'COMPLETED' 
       WHERE id = ?`,
      [status4, status4_remark || null, id]
    );

    // Insert history
    await db.query(
      `INSERT INTO free_lead_history (
        free_lead_id, telecaller_id, telecaller_name, action_type, 
        status4, status4_remark, status4_timestamp, notes
      ) VALUES (?, ?, ?, 'STATUS4_UPDATED', ?, ?, NOW(), 'Status 4 updated')`,
      [id, telecallerId, telecallerName, status4, status4_remark || null]
    );

    res.json({ success: true, message: "Status 4 updated successfully." });
  } catch (error) {
    console.error("updateStatus4 error:", error);
    res.status(500).json({ success: false, message: "Error updating status 4" });
  }
};

exports.getMyFreeLeads = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { period } = req.query;

    let dateWhere = "";
    if (period === 'current') {
      dateWhere = " AND YEAR(fl.fetched_at) = YEAR(CURDATE()) AND MONTH(fl.fetched_at) = MONTH(CURDATE())";
    } else if (period === 'past') {
      dateWhere = " AND fl.fetched_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND fl.fetched_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    const [leads] = await db.query(`
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      WHERE fl.current_telecaller_id = ? AND fl.free_status IN ('ASSIGNED', 'COMPLETED')
      AND (fl.is_closed_lead = 0 OR fl.is_closed_lead IS NULL) AND (fl.is_transferred_lead = 0 OR fl.is_transferred_lead IS NULL)
      ${dateWhere}
      ORDER BY fl.fetched_at DESC
    `, [telecallerId]);

    res.json({ success: true, leads });
  } catch (error) {
    console.error("getMyFreeLeads error:", error);
    res.status(500).json({ success: false, message: "Error fetching my free leads" });
  }
};

exports.getFreeLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const telecallerId = req.user.id;

    const [leads] = await db.query(`
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      WHERE fl.id = ? AND fl.current_telecaller_id = ?
    `, [id, telecallerId]);

    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Free lead not found" });
    }

    const [history] = await db.query(`
      SELECT * FROM free_lead_history 
      WHERE free_lead_id = ? 
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      lead: leads[0],
      history
    });
  } catch (error) {
    console.error("getFreeLeadDetails error:", error);
    res.status(500).json({ success: false, message: "Error fetching free lead details" });
  }
};

exports.getFreeLeadCallLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const telecallerId = req.user.id;
    
    const [leads] = await db.query(`SELECT contact_last10 FROM free_leads WHERE id = ?`, [id]);
    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = leads[0];

    const [logs] = await db.query(`
      SELECT * FROM callpulse_call_logs
      WHERE telecaller_id = ?
      AND (
        (lead_type = 'FREE' AND lead_id = ?)
        OR
        (normalized_number = ?)
      )
      ORDER BY call_started_at DESC
    `, [telecallerId, id, lead.contact_last10]);

    console.log(`[Telecaller Free Leads] Matched ${logs.length} call logs for lead ${id}`);

    res.json({ success: true, logs });
  } catch (err) {
    console.error("getFreeLeadCallLogs error:", err);
    res.status(500).json({ success: false, message: "Error fetching call logs" });
  }
};
