const db = require("../config/db");

exports.searchLeads = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchQuery = `%${q}%`;
    const role = req.user.role; // ADMIN or TELECALLER
    const userId = req.user.id;

    let roleFilter = "";
    let params = [];

    if (role === 'TELECALLER') {
      roleFilter = "AND telecaller_id = ?";
      params = [searchQuery, searchQuery, userId, searchQuery, searchQuery, userId];
    } else {
      params = [searchQuery, searchQuery, searchQuery, searchQuery];
    }

    const query = `
      SELECT 
        id, lead_name, lead_contact, status1, status2, status3, created_at, 'bot' as type, source, telecaller_id 
      FROM working_sheet 
      WHERE (lead_name LIKE ? OR lead_contact LIKE ?) ${roleFilter}
      
      UNION ALL
      
      SELECT 
        id, lead_name, lead_contact, status1, status2, status3, created_at, 'direct' as type, source, telecaller_id 
      FROM direct_leads 
      WHERE (lead_name LIKE ? OR lead_contact LIKE ?) ${roleFilter}
      
      ORDER BY created_at DESC 
      LIMIT 20
    `;

    const [rows] = await db.query(query, params);

    // If admin, we attach telecaller names
    if (role === 'ADMIN' && rows.length > 0) {
      const telecallerIds = [...new Set(rows.map(r => r.telecaller_id).filter(Boolean))];
      if (telecallerIds.length > 0) {
        const [tcRows] = await db.query(
          `SELECT id, telecaller_name FROM telecaller_master WHERE id IN (?)`,
          [telecallerIds]
        );
        const tcMap = {};
        tcRows.forEach(tc => tcMap[tc.id] = tc.telecaller_name);
        rows.forEach(r => r.telecaller_name = tcMap[r.telecaller_id] || 'Unassigned');
      }
    }

    res.json(rows);
  } catch (error) {
    console.error("searchLeads error:", error);
    res.status(500).json({ message: "Server error during search" });
  }
};
