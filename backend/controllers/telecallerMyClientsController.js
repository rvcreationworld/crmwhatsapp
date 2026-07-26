const db = require('../config/db');

exports.getMyClients = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    const query = `
      SELECT id, lead_name, lead_contact, source, kyc_done_at, created_at, 'working_sheet' as lead_table
      FROM working_sheet
      WHERE telecaller_id = ? AND is_kyc_done = 1
      UNION ALL
      SELECT id, lead_name, lead_contact, source, kyc_done_at, created_at, 'direct_leads' as lead_table
      FROM direct_leads
      WHERE telecaller_id = ? AND is_kyc_done = 1
      ORDER BY kyc_done_at DESC, created_at DESC
    `;

    const [rows] = await db.query(query, [telecallerId, telecallerId]);

    res.json({ success: true, clients: rows });
  } catch (error) {
    console.error("getMyClients error:", error);
    res.status(500).json({ success: false, message: "Server error fetching My Clients" });
  }
};

exports.getMyDhanClients = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    const query = `
      SELECT id, lead_id, client_name as lead_name, mobile as lead_contact, uploaded_at, 'dhan_clients' as lead_table
      FROM dhan_clients
      WHERE telecaller_id = ?
      ORDER BY uploaded_at DESC
    `;

    const [rows] = await db.query(query, [telecallerId]);

    res.json({ success: true, clients: rows });
  } catch (error) {
    console.error("getMyDhanClients error:", error);
    res.status(500).json({ success: false, message: "Server error fetching My Dhan Clients" });
  }
};
