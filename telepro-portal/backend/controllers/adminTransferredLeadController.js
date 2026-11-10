const db = require("../config/db");

exports.getTransferredLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [leads] = await db.query(`
      SELECT tl.*, 
             pt.telecaller_name AS previous_telecaller_name,
             ct.telecaller_name AS current_telecaller_name
      FROM transferred_leads tl
      LEFT JOIN telecaller_master pt ON tl.previous_telecaller_id = pt.id
      LEFT JOIN telecaller_master ct ON tl.current_telecaller_id = ct.id
      WHERE tl.id = ?
    `, [id]);

    if (leads.length === 0) {
      return res.status(404).json({ success: false, message: "Transferred lead not found" });
    }

    const lead = leads[0];

    const [status4History] = await db.query(`
      SELECT th.*, tm.telecaller_name
      FROM transferred_lead_history th
      LEFT JOIN telecaller_master tm ON th.telecaller_id = tm.id
      WHERE th.transferred_lead_id = ? AND th.action_type = 'STATUS4_UPDATED'
      ORDER BY th.created_at DESC
    `, [id]);

    // Fetch CallPulse Call Logs
    let numberToMatch = lead.contact_last10;
    if (!numberToMatch && lead.lead_contact) {
       numberToMatch = lead.lead_contact.replace(/[^0-9]/g, '').slice(-10);
    }

    const [callLogs] = await db.query(`
      SELECT * FROM callpulse_call_logs
      WHERE normalized_number = ? AND telecaller_id = ?
      ORDER BY call_started_at DESC
    `, [numberToMatch, lead.current_telecaller_id]);

    res.json({
      success: true,
      lead: lead,
      status4History,
      callLogs
    });
  } catch (error) {
    console.error("getTransferredLeadDetails error:", error);
    res.status(500).json({ success: false, message: "Error fetching transferred lead details" });
  }
};
