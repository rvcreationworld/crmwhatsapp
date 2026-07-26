const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [totalLeadsResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet");
    const [currentMonthResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())");
    const [pastMonthResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))");
    const [oldLeadsResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE created_at < DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)");
    
    const [telecallersResult] = await db.query("SELECT COUNT(*) AS total, SUM(CASE WHEN is_deleted = 0 AND is_active = 1 THEN 1 ELSE 0 END) AS active FROM telecaller_master");
    
    const [followUpResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE status3 IN ('Call Back')");
    const [closedResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE status3 = 'RdyKYC'");

    // Status breakdowns for extra info if needed
    const [statusBreakdown] = await db.query(`
      SELECT status3 as status, COUNT(*) as count 
      FROM working_sheet 
      WHERE status3 IS NOT NULL AND status3 != '' 
      GROUP BY status3
    `);

    res.json({
      totalLeads: totalLeadsResult[0].count,
      currentMonthLeads: currentMonthResult[0].count,
      pastMonthLeads: pastMonthResult[0].count,
      oldLeads: oldLeadsResult[0].count,
      totalTelecallers: telecallersResult[0].total || 0,
      activeTelecallers: telecallersResult[0].active || 0,
      followUpLeads: followUpResult[0].count,
      closedLeads: closedResult[0].count,
      statusBreakdown
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTelecallerSummary = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    
    const [totalLeadsResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE telecaller_id = ?", [telecallerId]);
    const [todaysCallsResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE telecaller_id = ? AND DATE(status2_timestamp) = CURDATE()", [telecallerId]);
    
    const [sourceResult] = await db.query(`
      SELECT source, COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ?
      GROUP BY source
    `, [telecallerId]);

    let botLeads = 0;
    let directLeads = 0;
    sourceResult.forEach(row => {
      if (row.source === 'PERSONAL_META_AD') directLeads = row.count;
      else botLeads += row.count; // ASSIGN or other
    });

    const [followUpResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE telecaller_id = ? AND status3 IN ('Call Back')", [telecallerId]);
    const [closedResult] = await db.query("SELECT COUNT(*) AS count FROM working_sheet WHERE telecaller_id = ? AND status3 = 'RdyKYC'", [telecallerId]);

    const [statusBreakdown] = await db.query(`
      SELECT status3 as status, COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ? AND status3 IS NOT NULL AND status3 != '' 
      GROUP BY status3
    `, [telecallerId]);

    res.json({
      totalLeads: totalLeadsResult[0].count,
      todaysCalls: todaysCallsResult[0].count,
      botLeads,
      directLeads,
      followUpLeads: followUpResult[0].count,
      closedLeads: closedResult[0].count,
      statusBreakdown
    });
  } catch (error) {
    console.error("Telecaller summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper for monthly analytics
const getMonthBoundsAndDays = (monthStr) => {
  // monthStr is 'YYYY-MM'
  const [year, month] = monthStr.split('-').map(Number);
  
  // Date in local time timezone - constructing bounds
  const startDate = new Date(year, month - 1, 1);
  const nextMonthStart = new Date(year, month, 1);
  
  // Check if it's current month in IST (or local CRM timezone)
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month - 1;
  
  // If current month, end date is tomorrow midnight (so it includes today fully up to < tomorrow)
  let endDate = nextMonthStart;
  let daysToGenerate = new Date(year, month, 0).getDate(); // days in month

  if (isCurrentMonth) {
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    daysToGenerate = now.getDate(); // Generate bars only up to today
  }

  // Generate days array
  const days = [];
  for (let d = 1; d <= daysToGenerate; d++) {
    const dStr = d.toString().padStart(2, '0');
    days.push({
      date: `${monthStr}-${dStr}`,
      day: d,
      direct_leads: 0,
      bot_leads: 0,
      total: 0
    });
  }

  // Format dates for mysql queries (YYYY-MM-DD)
  const formatForDb = (d) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: formatForDb(startDate),
    endDate: formatForDb(endDate),
    days,
    isCurrentMonth
  };
};

exports.getLeadSourceDaily = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM." });
    }

    const { startDate, endDate, days, isCurrentMonth } = getMonthBoundsAndDays(month);

    const chartDateExpr = `
      CASE
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status3_timestamp)
        WHEN status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL THEN status1_timestamp
        WHEN status2_timestamp IS NOT NULL THEN status2_timestamp
        WHEN status3_timestamp IS NOT NULL THEN status3_timestamp
        ELSE created_at
      END
    `;

    // Get direct leads
    const [directResult] = await db.query(`
      SELECT DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM direct_leads 
      WHERE ${chartDateExpr} >= ? AND ${chartDateExpr} < ?
      GROUP BY DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d')
    `, [startDate, endDate]);

    // Get bot leads (working_sheet)
    const [botAssignedResult] = await db.query(`
      SELECT DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM working_sheet 
      WHERE ${chartDateExpr} >= ? AND ${chartDateExpr} < ?
      GROUP BY DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d')
    `, [startDate, endDate]);

    // Get bot leads unassigned (new_leads) - new_leads doesn't have status timestamps, fallback to created_at
    const [botUnassignedResult] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM new_leads 
      WHERE created_at >= ? AND created_at < ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    `, [startDate, endDate]);

    let totalDirect = 0;
    let totalBot = 0;

    // Merge into days
    days.forEach(d => {
      const directRow = directResult.find(r => r.date === d.date);
      const botAssignedRow = botAssignedResult.find(r => r.date === d.date);
      const botUnassignedRow = botUnassignedResult.find(r => r.date === d.date);
      
      d.direct_leads = directRow ? parseInt(directRow.count, 10) : 0;
      
      const botAssignedCount = botAssignedRow ? parseInt(botAssignedRow.count, 10) : 0;
      const botUnassignedCount = botUnassignedRow ? parseInt(botUnassignedRow.count, 10) : 0;
      d.bot_leads = botAssignedCount + botUnassignedCount;
      
      d.total = d.direct_leads + d.bot_leads;
      
      totalDirect += d.direct_leads;
      totalBot += d.bot_leads;
    });

    res.json({
      success: true,
      month,
      is_current_month: isCurrentMonth,
      days,
      totals: {
        direct_leads: totalDirect,
        bot_leads: totalBot,
        total: totalDirect + totalBot
      }
    });
  } catch (error) {
    console.error("getLeadSourceDaily Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTelecallerLeadSourceDaily = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM." });
    }

    const { startDate, endDate, days, isCurrentMonth } = getMonthBoundsAndDays(month);

    const chartDateExpr = `
      CASE
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status2_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status2_timestamp)
        WHEN status1_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status1_timestamp, status3_timestamp)
        WHEN status2_timestamp IS NOT NULL AND status3_timestamp IS NOT NULL THEN LEAST(status2_timestamp, status3_timestamp)
        WHEN status1_timestamp IS NOT NULL THEN status1_timestamp
        WHEN status2_timestamp IS NOT NULL THEN status2_timestamp
        WHEN status3_timestamp IS NOT NULL THEN status3_timestamp
        ELSE created_at
      END
    `;

    // Get direct leads for telecaller
    const [directResult] = await db.query(`
      SELECT DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM direct_leads 
      WHERE telecaller_id = ? AND ${chartDateExpr} >= ? AND ${chartDateExpr} < ?
      GROUP BY DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d')
    `, [telecallerId, startDate, endDate]);

    // Get bot leads (working_sheet) for telecaller
    const [botResult] = await db.query(`
      SELECT DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d') as date, COUNT(*) as count 
      FROM working_sheet 
      WHERE telecaller_id = ? AND ${chartDateExpr} >= ? AND ${chartDateExpr} < ?
      GROUP BY DATE_FORMAT(${chartDateExpr}, '%Y-%m-%d')
    `, [telecallerId, startDate, endDate]);

    let totalDirect = 0;
    let totalBot = 0;

    // Merge into days
    days.forEach(d => {
      const directRow = directResult.find(r => r.date === d.date);
      const botRow = botResult.find(r => r.date === d.date);
      
      d.direct_leads = directRow ? parseInt(directRow.count, 10) : 0;
      d.bot_leads = botRow ? parseInt(botRow.count, 10) : 0;
      d.total = d.direct_leads + d.bot_leads;
      
      totalDirect += d.direct_leads;
      totalBot += d.bot_leads;
    });

    res.json({
      success: true,
      month,
      is_current_month: isCurrentMonth,
      days,
      totals: {
        direct_leads: totalDirect,
        bot_leads: totalBot,
        total: totalDirect + totalBot
      }
    });
  } catch (error) {
    console.error("getTelecallerLeadSourceDaily Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStatusUpdatesDaily = async (req, res) => {
  try {
    const { month, telecaller_id } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM." });
    }

    const { startDate, endDate, days, isCurrentMonth } = getMonthBoundsAndDays(month);
    let tFilter = "";
    let tFreeFilter = "";
    let tParams = [startDate, endDate];
    let tFreeParams = [startDate, endDate];

    if (telecaller_id && telecaller_id !== 'all') {
      tFilter = " AND telecaller_id = ? ";
      tParams.push(telecaller_id);
      
      tFreeFilter = " AND current_telecaller_id = ? ";
      tFreeParams.push(telecaller_id);
    }

    const buildQuery = (table, statusCol, filter) => `
      SELECT DATE_FORMAT(${statusCol}_timestamp, '%Y-%m-%d') as date, COUNT(*) as count
      FROM ${table}
      WHERE ${statusCol}_timestamp >= ? AND ${statusCol}_timestamp < ?
      AND ${statusCol}_timestamp IS NOT NULL
      AND ${statusCol} IS NOT NULL AND TRIM(${statusCol}) != '' AND TRIM(LOWER(${statusCol})) != 'none'
      ${filter}
      GROUP BY DATE_FORMAT(${statusCol}_timestamp, '%Y-%m-%d')
    `;

    // S1
    const [wsS1] = await db.query(buildQuery('working_sheet', 'status1', tFilter), tParams);
    const [dlS1] = await db.query(buildQuery('direct_leads', 'status1', tFilter), tParams);

    // S2
    const [wsS2] = await db.query(buildQuery('working_sheet', 'status2', tFilter), tParams);
    const [dlS2] = await db.query(buildQuery('direct_leads', 'status2', tFilter), tParams);

    // S3
    const [wsS3] = await db.query(buildQuery('working_sheet', 'status3', tFilter), tParams);
    const [dlS3] = await db.query(buildQuery('direct_leads', 'status3', tFilter), tParams);

    // S4 (free_leads & transferred_leads)
    const [flS4] = await db.query(buildQuery('free_leads', 'status4', tFreeFilter), tFreeParams);
    const [tlS4] = await db.query(buildQuery('transferred_leads', 'status4', tFreeFilter), tFreeParams);

    const mergeCounts = (arrList, targetDate) => {
      let sum = 0;
      for (const arr of arrList) {
        const row = arr.find(r => r.date === targetDate);
        if (row) sum += parseInt(row.count, 10);
      }
      return sum;
    };

    let totalS1 = 0, totalS2 = 0, totalS3 = 0, totalS4 = 0;

    days.forEach(d => {
      d.s1 = mergeCounts([wsS1, dlS1], d.date);
      d.s2 = mergeCounts([wsS2, dlS2], d.date);
      d.s3 = mergeCounts([wsS3, dlS3], d.date);
      d.s4 = mergeCounts([flS4, tlS4], d.date);
      d.total = d.s1 + d.s2 + d.s3 + d.s4;

      totalS1 += d.s1;
      totalS2 += d.s2;
      totalS3 += d.s3;
      totalS4 += d.s4;
    });

    res.json({
      success: true,
      month,
      is_current_month: isCurrentMonth,
      telecaller_id: telecaller_id || "all",
      days,
      totals: {
        s1: totalS1,
        s2: totalS2,
        s3: totalS3,
        s4: totalS4,
        total: totalS1 + totalS2 + totalS3 + totalS4
      }
    });

  } catch (error) {
    console.error("getStatusUpdatesDaily Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCallPulseDaily = async (req, res) => {
  try {
    const { month, telecaller_id } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM." });
    }

    const { startDate, endDate, days, isCurrentMonth } = getMonthBoundsAndDays(month);
    let tFilter = "";
    let tParams = [startDate, endDate];

    let effectiveTelecallerId = telecaller_id;

    if (req.user && req.user.role === 'TELECALLER') {
      effectiveTelecallerId = req.user.telecaller_id || req.user.id;
    }

    if (effectiveTelecallerId && effectiveTelecallerId !== 'all') {
      tFilter = " AND telecaller_id = ? ";
      tParams.push(effectiveTelecallerId);
    }

    const query = `
      SELECT 
        DATE_FORMAT(call_started_at, '%Y-%m-%d') AS date,
        COUNT(*) AS total_dialed,
        SUM(CASE WHEN COALESCE(duration_seconds, 0) > 0 THEN 1 ELSE 0 END) AS total_connected,
        COALESCE(SUM(COALESCE(duration_seconds, 0)), 0) AS total_duration_seconds
      FROM callpulse_call_logs
      WHERE call_started_at >= ? AND call_started_at < ?
      ${tFilter}
      GROUP BY DATE_FORMAT(call_started_at, '%Y-%m-%d')
      ORDER BY date ASC
    `;

    const [results] = await db.query(query, tParams);

    let totalDialed = 0, totalConnected = 0, totalDurationSeconds = 0;

    days.forEach(d => {
      const row = results.find(r => r.date === d.date);
      d.total_dialed = row ? parseInt(row.total_dialed, 10) : 0;
      d.total_connected = row ? parseInt(row.total_connected, 10) : 0;
      d.total_duration_seconds = row ? parseInt(row.total_duration_seconds, 10) : 0;
      d.total_duration_minutes = Math.round(d.total_duration_seconds / 60);

      totalDialed += d.total_dialed;
      totalConnected += d.total_connected;
      totalDurationSeconds += d.total_duration_seconds;
    });

    res.json({
      success: true,
      month,
      is_current_month: isCurrentMonth,
      telecaller_id: telecaller_id || "all",
      days,
      totals: {
        total_dialed: totalDialed,
        total_connected: totalConnected,
        total_duration_seconds: totalDurationSeconds,
        total_duration_minutes: Math.round(totalDurationSeconds / 60)
      }
    });

  } catch (error) {
    console.error("getCallPulseDaily Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
