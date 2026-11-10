const db = require('../config/db');

exports.getNetConversion = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id AS telecaller_id, 
        t.telecaller_name,
        (
          SELECT COUNT(*) 
          FROM working_sheet wl 
          WHERE wl.telecaller_id = t.id
        ) AS bot_leads_count,
        (
          SELECT COUNT(*) 
          FROM direct_leads dl 
          WHERE dl.telecaller_id = t.id
        ) AS direct_leads_count,
        (
          (SELECT COUNT(*) FROM working_sheet wl WHERE wl.telecaller_id = t.id AND wl.is_kyc_done = 1)
          +
          (SELECT COUNT(*) FROM direct_leads dl WHERE dl.telecaller_id = t.id AND dl.is_kyc_done = 1)
        ) AS angel_one_count,
        (
          SELECT COUNT(*) 
          FROM dhan_clients dc 
          WHERE dc.telecaller_id = t.id
        ) AS dhan_count
      FROM telecaller_master t
      WHERE t.is_active = 1 AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
      ORDER BY t.telecaller_name ASC
    `;

    const [rows] = await db.query(query);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('[NetConversion] Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching net conversion', error: error.message });
  }
};
