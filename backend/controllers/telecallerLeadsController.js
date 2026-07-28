const db = require("../config/db");
const { canUpdateLeadStatus } = require("../utils/callValidation");
const { getStatusLockState } = require("../utils/statusLockHelper");
const { getStatusLockingEnabled } = require("../utils/settingsHelper");

exports.getSummary = async (req, res) => {
  try {
    const telecallerId = req.user.id;

    // We will run raw queries to count leads based on dates.
    // 1. Current Month Counts
    const currentBotQuery = `
      SELECT COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
    `;
    const currentDirectQuery = `
      SELECT COUNT(*) as count 
      FROM direct_leads 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
    `;

    // 2. Past Month Counts
    const pastBotQuery = `
      SELECT COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `;
    const pastDirectQuery = `
      SELECT COUNT(*) as count 
      FROM direct_leads 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `;

    // 3. Old Leads Counts Grouped by Year and Month
    const oldBotQuery = `
      SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND created_at < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      GROUP BY YEAR(created_at), MONTH(created_at)
    `;
    const oldDirectQuery = `
      SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count 
      FROM direct_leads 
      WHERE telecaller_id = ? 
      AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
      AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
      AND created_at < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      GROUP BY YEAR(created_at), MONTH(created_at)
    `;

    const [[currentBot]] = await db.query(currentBotQuery, [telecallerId]);
    const [[currentDirect]] = await db.query(currentDirectQuery, [telecallerId]);
    
    const [[pastBot]] = await db.query(pastBotQuery, [telecallerId]);
    const [[pastDirect]] = await db.query(pastDirectQuery, [telecallerId]);

    
    const [[currentFree]] = await db.query(
      "SELECT COUNT(*) as count FROM free_leads WHERE current_telecaller_id = ? AND free_status IN ('ASSIGNED', 'COMPLETED') AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND YEAR(fetched_at) = YEAR(CURDATE()) AND MONTH(fetched_at) = MONTH(CURDATE())",
      [telecallerId]
    );
    const [[currentTransferred]] = await db.query(
      "SELECT COUNT(*) as count FROM transferred_leads WHERE current_telecaller_id = ? AND transfer_status IN ('ASSIGNED', 'COMPLETED') AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND YEAR(transferred_at) = YEAR(CURDATE()) AND MONTH(transferred_at) = MONTH(CURDATE())",
      [telecallerId]
    );
    const [[pastFree]] = await db.query(
      "SELECT COUNT(*) as count FROM free_leads WHERE current_telecaller_id = ? AND free_status IN ('ASSIGNED', 'COMPLETED') AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND fetched_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND fetched_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')",
      [telecallerId]
    );
    const [[pastTransferred]] = await db.query(
      "SELECT COUNT(*) as count FROM transferred_leads WHERE current_telecaller_id = ? AND transfer_status IN ('ASSIGNED', 'COMPLETED') AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND transferred_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND transferred_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')",
      [telecallerId]
    );

    const [oldBotRows] = await db.query(oldBotQuery, [telecallerId]);
    const [oldDirectRows] = await db.query(oldDirectQuery, [telecallerId]);

    // Map old leads into a unified array
    const oldLeadsMap = {};
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    for (let row of oldBotRows) {
      const key = `${row.year}-${row.month}`;
      oldLeadsMap[key] = {
        year: row.year,
        month: row.month,
        monthName: `${monthNames[row.month - 1]} ${row.year}`,
        bot: row.count,
        direct: 0
      };
    }

    for (let row of oldDirectRows) {
      const key = `${row.year}-${row.month}`;
      if (!oldLeadsMap[key]) {
        oldLeadsMap[key] = {
          year: row.year,
          month: row.month,
          monthName: `${monthNames[row.month - 1]} ${row.year}`,
          bot: 0,
          direct: row.count
        };
      } else {
        oldLeadsMap[key].direct = row.count;
      }
    }

    const oldLeadsArray = Object.values(oldLeadsMap).sort((a, b) => {
       if (a.year !== b.year) return b.year - a.year;
       return b.month - a.month;
    });

    const [kycBotRows] = await db.execute(
      "SELECT COUNT(*) as count FROM working_sheet WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC')",
      [telecallerId]
    );
    const [kycDirectRows] = await db.execute(
      "SELECT COUNT(*) as count FROM direct_leads WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC')",
      [telecallerId]
    );

    // Use IST timezone for "today" to accurately exclude leads updated today in India
    const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${nowIst.getFullYear()}-${String(nowIst.getMonth() + 1).padStart(2, '0')}-${String(nowIst.getDate()).padStart(2, '0')}`;

    const ringingCondition = `(
      (status3 = 'Ringing')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Ringing')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Ringing')
    )
    AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) < '${todayStr}'
    AND (status1_timestamp IS NULL OR DATE(CONVERT_TZ(status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status2_timestamp IS NULL OR DATE(CONVERT_TZ(status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status3_timestamp IS NULL OR DATE(CONVERT_TZ(status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;

    const callbackCondition = `(
      (status3 = 'Call Back')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Call Back')
      OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Call Back')
    )
    AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) < '${todayStr}'
    AND (status1_timestamp IS NULL OR DATE(CONVERT_TZ(status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status2_timestamp IS NULL OR DATE(CONVERT_TZ(status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status3_timestamp IS NULL OR DATE(CONVERT_TZ(status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;

    const [ringingBotRows] = await db.execute(
      `SELECT COUNT(*) as count FROM working_sheet WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND ${ringingCondition}`,
      [telecallerId]
    );
    const [ringingDirectRows] = await db.execute(
      `SELECT COUNT(*) as count FROM direct_leads WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND ${ringingCondition}`,
      [telecallerId]
    );

    const [callbackBotRows] = await db.execute(
      `SELECT COUNT(*) as count FROM working_sheet WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND ${callbackCondition}`,
      [telecallerId]
    );
    const [callbackDirectRows] = await db.execute(
      `SELECT COUNT(*) as count FROM direct_leads WHERE telecaller_id = ? AND (is_kyc_done = 0 OR is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND ${callbackCondition}`,
      [telecallerId]
    );

    res.json({
      
      current: {
        bot: currentBot.count,
        direct: currentDirect.count,
        free: currentFree.count,
        transferred: currentTransferred.count
      },
      past: {
        bot: pastBot.count,
        direct: pastDirect.count,
        free: pastFree.count,
        transferred: pastTransferred.count
      },
      kyc: {
        bot: kycBotRows[0].count,
        direct: kycDirectRows[0].count
      },
      ringing: {
        bot: ringingBotRows[0].count,
        direct: ringingDirectRows[0].count
      },
      callback: {
        bot: callbackBotRows[0].count,
        direct: callbackDirectRows[0].count
      },
      old: oldLeadsArray
    });

  } catch (error) {
    console.error("getSummary error:", error);
    res.status(500).json({ message: "Server error fetching leads summary" });
  }
};

exports.getList = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { period, type, year, month, search, status1, status2, status3, timeFilter } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let tableName = type === "bot" ? "working_sheet" : "direct_leads";

    let dateWhereClause = "";
    const params = [telecallerId];

    if (period === "current") {
      if (timeFilter === "today") {
        dateWhereClause = `DATE(${tableName}.created_at) = CURDATE()`;
      } else if (timeFilter === "yesterday") {
        dateWhereClause = `DATE(${tableName}.created_at) = CURDATE() - INTERVAL 1 DAY`;
      } else {
        dateWhereClause = `YEAR(${tableName}.created_at) = YEAR(CURDATE()) AND MONTH(${tableName}.created_at) = MONTH(CURDATE())`;
      }
    } else if (period === "past") {
      dateWhereClause = `${tableName}.created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND ${tableName}.created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
    } else if (period === "old") {
      if (!year || !month) return res.status(400).json({ message: "Year and month are required for old leads" });
      dateWhereClause = `YEAR(${tableName}.created_at) = ? AND MONTH(${tableName}.created_at) = ?`;
      params.push(year, month);
    } else if (period === "ringing") {
      const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const todayStr = `${nowIst.getFullYear()}-${String(nowIst.getMonth() + 1).padStart(2, '0')}-${String(nowIst.getDate()).padStart(2, '0')}`;
      
      dateWhereClause = `(
        (${tableName}.status3 = 'Ringing')
        OR 
        ((${tableName}.status3 IS NULL OR ${tableName}.status3 = 'None' OR ${tableName}.status3 = '') AND ${tableName}.status2 = 'Ringing')
        OR 
        ((${tableName}.status3 IS NULL OR ${tableName}.status3 = 'None' OR ${tableName}.status3 = '') AND (${tableName}.status2 IS NULL OR ${tableName}.status2 = 'None' OR ${tableName}.status2 = '') AND ${tableName}.status1 = 'Ringing')
      )
      AND DATE(CONVERT_TZ(${tableName}.created_at, '+00:00', '+05:30')) < '${todayStr}'
      AND (${tableName}.status1_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
      AND (${tableName}.status2_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
      AND (${tableName}.status3_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;
    } else if (period === "callback") {
      const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const todayStr = `${nowIst.getFullYear()}-${String(nowIst.getMonth() + 1).padStart(2, '0')}-${String(nowIst.getDate()).padStart(2, '0')}`;
      
      dateWhereClause = `(
        (${tableName}.status3 = 'Call Back')
        OR 
        ((${tableName}.status3 IS NULL OR ${tableName}.status3 = 'None' OR ${tableName}.status3 = '') AND ${tableName}.status2 = 'Call Back')
        OR 
        ((${tableName}.status3 IS NULL OR ${tableName}.status3 = 'None' OR ${tableName}.status3 = '') AND (${tableName}.status2 IS NULL OR ${tableName}.status2 = 'None' OR ${tableName}.status2 = '') AND ${tableName}.status1 = 'Call Back')
      )
      AND DATE(CONVERT_TZ(${tableName}.created_at, '+00:00', '+05:30')) < '${todayStr}'
      AND (${tableName}.status1_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
      AND (${tableName}.status2_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
      AND (${tableName}.status3_timestamp IS NULL OR DATE(CONVERT_TZ(${tableName}.status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;
    } else if (period === "kyc") {
      dateWhereClause = `(${tableName}.status1 = 'RdyKYC' OR ${tableName}.status2 = 'RdyKYC' OR ${tableName}.status3 = 'RdyKYC')`;
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
    if (status1) {
      filterWhere += ` AND ${tableName}.status1 = ?`;
      params.push(status1);
    }
    if (status2) {
      filterWhere += ` AND ${tableName}.status2 = ?`;
      params.push(status2);
    }
    if (status3) {
      filterWhere += ` AND ${tableName}.status3 = ?`; 
      params.push(status3);
    }

    const fullWhere = `WHERE ${tableName}.telecaller_id = ? AND (${tableName}.is_kyc_done = 0 OR ${tableName}.is_kyc_done IS NULL) AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL) AND ${dateWhereClause} ${searchWhere} ${filterWhere}`;

    const countQuery = `SELECT COUNT(*) as count FROM ${tableName} ${fullWhere}`;
    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0].count;

    let joinCondition = '';
    if (type.toUpperCase() === 'DIRECT') {
      joinCondition = `call_stats.normalized_number = ${tableName}.contact_last10`;
    } else {
      joinCondition = `call_stats.normalized_number = RIGHT(REGEXP_REPLACE(${tableName}.lead_contact, '[^0-9]', ''), 10)`;
    }

    const callStatsJoin = `
      LEFT JOIN (
        SELECT
          telecaller_id,
          normalized_number,
          COUNT(*) AS total_calls
        FROM callpulse_call_logs
        WHERE telecaller_id = ?
        GROUP BY telecaller_id, normalized_number
      ) call_stats
        ON call_stats.telecaller_id = ${tableName}.telecaller_id
       AND ${joinCondition}
    `;

    const selectCols = `
      ${tableName}.*,
      COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      IF(COALESCE(call_stats.total_calls, 0) > 0, 'CONNECTED', 'NOT_CALLED') AS call_dot_type,
      (wc.customer_response = 'INTERESTED') AS is_wa_interested
    `;

    const dataQuery = `SELECT ${selectCols} FROM ${tableName} ${callStatsJoin} LEFT JOIN whatsapp_conversations wc ON ${tableName}.lead_contact COLLATE utf8mb4_unicode_ci = wc.phone_number COLLATE utf8mb4_unicode_ci ${fullWhere} ORDER BY ${tableName}.created_at DESC LIMIT ? OFFSET ?`;
    const dataParams = [telecallerId, ...params, limit, offset];
    const [rows] = await db.query(dataQuery, dataParams);

    if (tableName === "direct_leads") {
      console.log("CURRENT_DIRECT_LEADS_FETCH_HIT");
      console.log("telecallerId:", telecallerId);
      console.log("firstRow:", rows[0]);
      console.log("firstRowStatuses:", rows[0]?.status1, rows[0]?.status2, rows[0]?.status3);
    }

    const lockEnabled = await getStatusLockingEnabled();

    const enrichedRows = rows.map(row => ({
      ...row,
      ...getStatusLockState(row, lockEnabled)
    }));

    res.json({
      data: enrichedRows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });

  } catch (error) {
    console.error("getList error:", error);
    res.status(500).json({ message: "Server error fetching leads list" });
  }
};

exports.checkStatusPermission = async (req, res) => {
  try {
    const { leadType, leadId } = req.params;

    let tableName;
    if (leadType?.toUpperCase() === 'BOT') tableName = 'working_sheet';
    else if (leadType?.toUpperCase() === 'TRANSFERRED') tableName = 'transferred_leads';
    else if (leadType?.toUpperCase() === 'FREE') tableName = 'free_leads';
    else tableName = 'direct_leads';

    let leads = [];
    if (tableName === 'transferred_leads' || tableName === 'free_leads') {
      [leads] = await db.query(`SELECT status4 as status1, status4_timestamp as status1_timestamp, 'None' as status_lock_type, 0 as is_kyc_done FROM ${tableName} WHERE id = ?`, [leadId]);
    } else {
      [leads] = await db.query(`SELECT status1, status1_timestamp, status2, status2_timestamp, status3, status3_timestamp, status_lock_type, is_kyc_done FROM ${tableName} WHERE id = ?`, [leadId]);
    }
    const lockState = leads.length > 0 ? getStatusLockState(leads[0]) : getStatusLockState(null);

    res.json({
      success: true,
      ...lockState
    });
  } catch (error) {
    console.error("checkStatusPermission error:", error);
    res.status(500).json({ success: false, message: "Server error checking permission" });
  }
};

