const db = require("../config/db");

exports.getStatusSummary = async (req, res) => {
  try {
    const source = req.query.source || 'ALL';
    let query = `
      SELECT status3 as status1, COUNT(*) as count 
      FROM working_sheet 
      WHERE status3 IS NOT NULL AND status3 != ''
    `;
    const params = [];

    if (source !== 'ALL') {
      if (source === 'BOT') {
        query += ` AND (source IS NULL OR source != 'PERSONAL_META_AD')`;
      } else {
        query += ` AND source = ?`;
        params.push(source);
      }
    }

    query += ` GROUP BY status3 ORDER BY count DESC`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("getStatusSummary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTelecallerPerformance = async (req, res) => {
  try {
    const source = req.query.source || 'ALL';
    let wsCondition = '';
    const params = [];

    if (source !== 'ALL') {
      if (source === 'BOT') {
        wsCondition = ` AND (ws.source IS NULL OR ws.source != 'PERSONAL_META_AD')`;
      } else {
        wsCondition = ` AND ws.source = ?`;
        params.push(source);
      }
    }

    const [rows] = await db.query(`
      SELECT 
        tm.telecaller_name,
        COUNT(ws.id) as total_assigned,
        SUM(CASE WHEN ws.status3 = 'Closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN ws.status3 = 'Follow-up' OR ws.status3 = 'Call Back' THEN 1 ELSE 0 END) as followup_count,
        MAX(ws.created_at) as last_lead_date
      FROM telecaller_master tm
      LEFT JOIN working_sheet ws ON tm.id = ws.telecaller_id ${wsCondition}
      GROUP BY tm.id
      ORDER BY total_assigned DESC
    `, params);

    res.json(rows);
  } catch (error) {
    console.error("getTelecallerPerformance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCampaignPerformance = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        tc.campaign_name,
        tm.telecaller_name,
        tc.total_imported,
        tc.created_at,
        SUM(CASE WHEN ws.status3 = 'Closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN ws.status3 IS NOT NULL AND ws.status3 != 'None' AND ws.status3 != 'New' THEN 1 ELSE 0 END) as actioned_count
      FROM telecaller_campaigns tc
      JOIN telecaller_master tm ON tc.telecaller_id = tm.id
      LEFT JOIN working_sheet ws ON ws.telecaller_id = tm.id AND ws.source = 'PERSONAL_META_AD' AND ws.created_at >= tc.created_at
      GROUP BY tc.id
      ORDER BY tc.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("getCampaignPerformance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.exportData = async (req, res) => {
  try {
    const type = req.query.type || 'working_sheet';
    const source = req.query.source || 'ALL';
    
    let query = "";
    const params = [];

    if (type === 'working_sheet') {
      let whereClause = "WHERE 1=1";
      if (source !== 'ALL') {
        if (source === 'BOT') {
          whereClause += " AND (ws.source IS NULL OR ws.source != 'PERSONAL_META_AD')";
        } else {
          whereClause += " AND ws.source = ?";
          params.push(source);
        }
      }

      query = `
        SELECT ws.*, tm.telecaller_name 
        FROM working_sheet ws
        LEFT JOIN telecaller_master tm ON ws.telecaller_id = tm.id
        ${whereClause}
        ORDER BY ws.created_at DESC
        LIMIT 1000
      `;
    } else {
      query = `SELECT * FROM new_leads ORDER BY created_at DESC LIMIT 1000`;
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("exportData error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
