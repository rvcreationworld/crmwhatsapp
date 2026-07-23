const db = require("../config/db");

exports.getList = async (req, res) => {
  try {
    const { period, type, year, month, search, status1, status2, status3, timeFilter, telecaller_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let tableName = "working_sheet";
    if (type === "direct") tableName = "direct_leads";
    else if (type === "free") tableName = "free_leads";
    else if (type === "transferred") tableName = "transferred_leads";

    let dateField = `${tableName}.created_at`;
    if (type === "free") {
      dateField = `COALESCE(${tableName}.fetched_at, ${tableName}.moved_to_free_at, ${tableName}.created_at)`;
    } else if (type === "transferred") {
      dateField = `COALESCE(${tableName}.transferred_at, ${tableName}.created_at)`;
    }

    let dateWhereClause = "";
    const params = [];

    if (period === "current") {
      if (timeFilter === "today") {
        dateWhereClause = `DATE(${dateField}) = CURDATE()`;
      } else if (timeFilter === "yesterday") {
        dateWhereClause = `DATE(${dateField}) = CURDATE() - INTERVAL 1 DAY`;
      } else {
        dateWhereClause = `YEAR(${dateField}) = YEAR(CURDATE()) AND MONTH(${dateField}) = MONTH(CURDATE())`;
      }
    } else if (period === "past") {
      dateWhereClause = `${dateField} >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND ${dateField} < DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
    } else if (period === "old") {
      if (!year || !month) return res.status(400).json({ message: "Year and month are required for old leads" });
      dateWhereClause = `YEAR(${dateField}) = ? AND MONTH(${dateField}) = ?`;
      params.push(year, month);
    } else {
      return res.status(400).json({ message: "Invalid period" });
    }

    let searchWhere = "";
    if (search) {
      searchWhere = ` AND (${tableName}.lead_name LIKE ? OR ${tableName}.lead_contact LIKE ?)`;
      const searchStr = `%${search}%`;
      params.push(searchStr, searchStr);
    }

    let filterWhere = "";
    if (status1 && (type === "bot" || type === "direct")) {
      filterWhere += ` AND ${tableName}.status1 = ?`;
      params.push(status1);
    }
    if (status2 && (type === "bot" || type === "direct")) {
      filterWhere += ` AND ${tableName}.status2 = ?`;
      params.push(status2);
    }
    if (status3 && (type === "bot" || type === "direct")) {
      filterWhere += ` AND ${tableName}.status3 = ?`;
      params.push(status3);
    }

    if (type === "bot") {
       filterWhere += ` AND (${tableName}.source IS NULL OR ${tableName}.source != 'PERSONAL_META_AD')`;
    }

    let telecallerFilter = "";
    if (type === "free" || type === "transferred") {
      telecallerFilter = ` AND ${tableName}.current_telecaller_id IS NOT NULL`;
      if (telecaller_id && telecaller_id !== "all") {
        telecallerFilter += ` AND ${tableName}.current_telecaller_id = ?`;
        params.push(telecaller_id);
      }
    } else {
      if (telecaller_id && telecaller_id !== "all") {
        telecallerFilter = ` AND ${tableName}.telecaller_id = ?`;
        params.push(telecaller_id);
      }
    }

    const fullWhere = `WHERE ${dateWhereClause} ${searchWhere} ${filterWhere} ${telecallerFilter}`;

    const countQuery = `SELECT COUNT(*) as count FROM ${tableName} ${fullWhere}`;
    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0].count;

    let joinCondition = '';
    if (type === "free" || type === "transferred") {
        joinCondition = `call_stats.normalized_number = ${tableName}.contact_last10 COLLATE utf8mb4_unicode_ci`;
    } else if (type === 'direct') {
      joinCondition = `call_stats.normalized_number = ${tableName}.contact_last10 COLLATE utf8mb4_unicode_ci`;
    } else {
      joinCondition = `call_stats.normalized_number = RIGHT(REGEXP_REPLACE(${tableName}.lead_contact, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci`;
    }

    const callStatsJoin = `
      LEFT JOIN (
        SELECT
          normalized_number,
          COUNT(*) AS total_calls
        FROM callpulse_call_logs
        GROUP BY normalized_number
      ) call_stats
        ON ${joinCondition}
    `;

    let tcJoin = "";
    let selectCols = `
      ${tableName}.*,
      COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      CASE
        WHEN COALESCE(call_stats.total_calls, 0) > 0 THEN 'CONNECTED'
        ELSE 'NOT_CALLED'
      END AS call_dot_type,
      (wc.customer_response = 'INTERESTED') AS is_wa_interested
    `;

    if (type === "free") {
      tcJoin = `LEFT JOIN telecaller_master tm1 ON ${tableName}.current_telecaller_id = tm1.id`;
      selectCols += `, tm1.telecaller_name as current_telecaller_name, tm1.telecaller_name as telecaller_name`;
    } else if (type === "transferred") {
      tcJoin = `
        LEFT JOIN telecaller_master tm1 ON ${tableName}.current_telecaller_id = tm1.id
        LEFT JOIN telecaller_master tm2 ON ${tableName}.previous_telecaller_id = tm2.id
      `;
      selectCols += `, tm1.telecaller_name as current_telecaller_name, tm1.telecaller_name as telecaller_name, tm2.telecaller_name as previous_telecaller_name`;
    } else {
      tcJoin = `LEFT JOIN telecaller_master tm1 ON ${tableName}.telecaller_id = tm1.id`;
      selectCols += `, tm1.telecaller_name as telecaller_name`;
    }

    const dataQuery = `
      SELECT ${selectCols} 
      FROM ${tableName} 
      ${tcJoin}
      ${callStatsJoin}
      LEFT JOIN whatsapp_conversations wc ON ${tableName}.lead_contact COLLATE utf8mb4_unicode_ci = wc.phone_number COLLATE utf8mb4_unicode_ci
      ${fullWhere} 
      ORDER BY ${dateField} DESC 
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, limit, offset];
    const [rows] = await db.query(dataQuery, dataParams);

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });

  } catch (error) {
    console.error("getAdminList error:", error);
    res.status(500).json({ message: "Server error fetching leads list" });
  }
};
