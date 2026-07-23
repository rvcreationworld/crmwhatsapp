const closedLeadService = require('../services/closedLeadService');
const db = require('../config/db');

exports.scanAndMove = async (req, res) => {
  try {
    const result = await closedLeadService.moveEligibleClosedLeads();
    res.json(result);
  } catch (error) {
    console.error("Error in scanAndMove closed leads:", error);
    res.status(500).json({ success: false, message: "Internal server error during closed leads scan." });
  }
};

exports.getClosedLeads = async (req, res) => {
  try {
    const { source_table, closing_status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT id, source_table, source_lead_id, lead_name, lead_contact, telecaller_name, previous_telecaller_name, closing_status, closing_status_level, last_status_updated_at, closed_at FROM closed_leads WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM closed_leads WHERE 1=1`;
    const params = [];

    if (source_table && source_table !== 'All') {
      query += ` AND source_table = ?`;
      countQuery += ` AND source_table = ?`;
      params.push(source_table);
    }

    if (closing_status && closing_status !== 'All') {
      query += ` AND LOWER(closing_status) = ?`;
      countQuery += ` AND LOWER(closing_status) = ?`;
      params.push(closing_status.toLowerCase());
    }

    if (search) {
      const searchTerm = `%${search}%`;
      const searchClause = ` AND (lead_name LIKE ? OR lead_contact LIKE ? OR telecaller_name LIKE ? OR previous_telecaller_name LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY closed_at DESC LIMIT ? OFFSET ?`;

    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0].total;

    // Add limit/offset to params for the main query
    const mainParams = [...params, parseInt(limit), parseInt(offset)];
    const [rows] = await db.query(query, mainParams);

    res.json({
      success: true,
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Error fetching closed leads:", error);
    res.status(500).json({ success: false, message: "Internal server error fetching closed leads." });
  }
};

exports.getClosedLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`SELECT * FROM closed_leads WHERE id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Closed lead not found." });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching closed lead by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
