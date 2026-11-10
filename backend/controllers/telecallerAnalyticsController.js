const db = require("../config/db");

// Helper to calculate Indian Standard Time (IST) offset
const getISTDate = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5)); // IST is +5:30
};

const formatDateForSQL = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Generate time buckets based on range
const generateBuckets = (range, startDateStr, endDateStr) => {
  const buckets = [];
  const now = getISTDate();
  
  if (range === 'today' || range === 'yesterday' || (range === 'custom' && startDateStr === endDateStr)) {
    // 11 AM to 10 PM (11 bars)
    let baseDate = getISTDate();
    if (range === 'yesterday') {
      baseDate.setDate(baseDate.getDate() - 1);
    } else if (range === 'custom') {
      baseDate = new Date(startDateStr);
    }
    
    baseDate.setHours(0, 0, 0, 0); // Start of day
    
    for (let i = 11; i <= 21; i++) {
      const start = new Date(baseDate);
      start.setHours(i, 0, 0, 0);
      const end = new Date(baseDate);
      end.setHours(i + 1, 0, 0, 0);
      
      const label = `${i > 12 ? i - 12 : i} ${i >= 12 ? 'PM' : 'AM'} - ${i + 1 > 12 ? i + 1 - 12 : i + 1} ${i + 1 >= 12 ? 'PM' : 'AM'}`;
      
      buckets.push({
        key: `${i}-${i+1}`,
        label,
        start: formatDateForSQL(start),
        end: formatDateForSQL(end),
        totalLeads: 0,
        botLeads: 0,
        directLeads: 0,
        contactedLeads: 0,
        calls: 0,
        qualityTimeSeconds: 0,
        connectedCalls: 0,
        totalTalkTimeSeconds: 0
      });
    }
  } else if (range === 'week' || (range === 'custom' && new Date(endDateStr) - new Date(startDateStr) <= 31 * 24 * 60 * 60 * 1000)) {
    // Daily bars
    let current = range === 'week' ? getISTDate() : new Date(startDateStr);
    let endTarget = range === 'week' ? getISTDate() : new Date(endDateStr);
    
    if (range === 'week') {
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      current.setDate(diff);
      current.setHours(0, 0, 0, 0);
      endTarget = new Date(current);
      endTarget.setDate(endTarget.getDate() + 6);
    }
    
    current.setHours(0,0,0,0);
    endTarget.setHours(23,59,59,999);
    
    while (current <= endTarget) {
      const start = new Date(current);
      const end = new Date(current);
      end.setHours(24, 0, 0, 0);
      
      buckets.push({
        key: start.toISOString().split('T')[0],
        label: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        start: formatDateForSQL(start),
        end: formatDateForSQL(end),
        totalLeads: 0, botLeads: 0, directLeads: 0, contactedLeads: 0, calls: 0, qualityTimeSeconds: 0, connectedCalls: 0, totalTalkTimeSeconds: 0
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (range === 'month') {
    // 4 weeks of the current month
    const baseDate = getISTDate();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    const weekRanges = [
      { start: 1, end: 7, label: "Week 1" },
      { start: 8, end: 14, label: "Week 2" },
      { start: 15, end: 21, label: "Week 3" },
      { start: 22, end: 31, label: "Week 4" } // End will be capped by SQL natively if past month end
    ];
    
    weekRanges.forEach((w, idx) => {
      const start = new Date(year, month, w.start);
      let end = new Date(year, month, w.end + 1);
      // Ensure we don't bleed into next month for week 4
      if (end.getMonth() !== month) {
         end = new Date(year, month + 1, 1);
      }
      
      buckets.push({
        key: `w${idx+1}`,
        label: w.label,
        start: formatDateForSQL(start),
        end: formatDateForSQL(end),
        totalLeads: 0, botLeads: 0, directLeads: 0, contactedLeads: 0, calls: 0, qualityTimeSeconds: 0, connectedCalls: 0, totalTalkTimeSeconds: 0
      });
    });
  } else if (range === 'year' || range === 'custom') {
    // Month bars
    let startYear = range === 'year' ? getISTDate().getFullYear() : new Date(startDateStr).getFullYear();
    let endYear = range === 'year' ? getISTDate().getFullYear() : new Date(endDateStr).getFullYear();
    let startMonth = range === 'year' ? 0 : new Date(startDateStr).getMonth();
    let endMonth = range === 'year' ? 11 : new Date(endDateStr).getMonth();

    let currentYear = startYear;
    let currentMonth = startMonth;

    while(currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 1);
      
      buckets.push({
        key: `${currentYear}-${currentMonth}`,
        label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        start: formatDateForSQL(start),
        end: formatDateForSQL(end),
        totalLeads: 0, botLeads: 0, directLeads: 0, contactedLeads: 0, calls: 0, qualityTimeSeconds: 0, connectedCalls: 0, totalTalkTimeSeconds: 0
      });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  return buckets;
};

exports.getAnalytics = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    let { range = "today", startDate, endDate } = req.query;
    
    const buckets = generateBuckets(range, startDate, endDate);
    
    if (buckets.length === 0) {
      return res.json({ success: true, range, summary: {}, bars: [] });
    }

    const overallStart = buckets[0].start;
    const overallEnd = buckets[buckets.length - 1].end;

    // Fetch BOT Leads
    const [botLeadsRows] = await db.query(
      `SELECT id, created_at, 
        COALESCE(NULLIF(status3, ''), NULLIF(status2, ''), NULLIF(status1, ''), 'Pending') as current_status,
        (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC') as is_rdykyc
       FROM working_sheet 
       WHERE telecaller_id = ? AND created_at >= ? AND created_at < ?`,
      [telecallerId, overallStart, overallEnd]
    );

    // Fetch DIRECT Leads
    const [directLeadsRows] = await db.query(
      `SELECT id, created_at, 
        COALESCE(NULLIF(status3, ''), NULLIF(status2, ''), NULLIF(status1, ''), 'Pending') as current_status,
        (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC') as is_rdykyc
       FROM direct_leads 
       WHERE telecaller_id = ? AND created_at >= ? AND created_at < ?`,
      [telecallerId, overallStart, overallEnd]
    );

    // Fetch CALL LOGS
    const [callLogsRows] = await db.query(
      `SELECT id, call_started_at, duration_seconds, call_type, lead_type, lead_id
       FROM callpulse_call_logs 
       WHERE telecaller_id = ? AND call_started_at >= ? AND call_started_at < ?`,
      [telecallerId, overallStart, overallEnd]
    );

    // Aggregate Summary
    const summary = {
      totalAssignedLeads: botLeadsRows.length + directLeadsRows.length,
      botLeads: botLeadsRows.length,
      directLeads: directLeadsRows.length,
      contactedLeads: 0,
      callsSynced: callLogsRows.length,
      connectedCalls: 0,
      missedRejectedCalls: 0,
      totalTalkTimeSeconds: 0,
      averageQualityTimeSeconds: 0,
      readyToKycLeads: 0,
      followUps: 0,
      closedLeads: 0,
      pendingLeads: 0,
      conversionRate: 0
    };

    // Process Calls for Contacted Leads & Time
    const contactedSet = new Set();
    callLogsRows.forEach(call => {
      const isConnected = ['INCOMING', 'OUTGOING'].includes(call.call_type) && call.duration_seconds > 0;
      
      if (isConnected) {
        summary.connectedCalls++;
        summary.totalTalkTimeSeconds += call.duration_seconds;
        contactedSet.add(`${call.lead_type}_${call.lead_id}`);
      } else {
        summary.missedRejectedCalls++;
      }
    });
    summary.contactedLeads = contactedSet.size;
    
    if (summary.connectedCalls > 0) {
      summary.averageQualityTimeSeconds = Math.round(summary.totalTalkTimeSeconds / summary.connectedCalls);
    }

    // Process Leads Status
    const allLeads = [...botLeadsRows, ...directLeadsRows];
    allLeads.forEach(lead => {
      if (lead.is_rdykyc) summary.readyToKycLeads++;
      if (['Call Back', 'Think&LMK'].includes(lead.current_status)) summary.followUps++;
      if (lead.current_status === 'Not Int' || lead.current_status === 'RdyKYC') summary.closedLeads++;
      if (lead.current_status === 'Pending') summary.pendingLeads++;
    });

    if (summary.totalAssignedLeads > 0) {
      summary.conversionRate = Number(((summary.readyToKycLeads / summary.totalAssignedLeads) * 100).toFixed(1));
    }

    // Populate Buckets
    buckets.forEach(bucket => {
      const bStart = new Date(bucket.start).getTime();
      const bEnd = new Date(bucket.end).getTime();

      botLeadsRows.forEach(lead => {
        const time = new Date(lead.created_at).getTime();
        if (time >= bStart && time < bEnd) {
          bucket.botLeads++;
          bucket.totalLeads++;
        }
      });

      directLeadsRows.forEach(lead => {
        const time = new Date(lead.created_at).getTime();
        if (time >= bStart && time < bEnd) {
          bucket.directLeads++;
          bucket.totalLeads++;
        }
      });

      const bucketContacted = new Set();
      callLogsRows.forEach(call => {
        const time = new Date(call.call_started_at).getTime();
        if (time >= bStart && time < bEnd) {
          bucket.calls++;
          const isConnected = ['INCOMING', 'OUTGOING'].includes(call.call_type) && call.duration_seconds > 0;
          if (isConnected) {
            bucket.connectedCalls++;
            bucket.totalTalkTimeSeconds += call.duration_seconds;
            bucketContacted.add(`${call.lead_type}_${call.lead_id}`);
          }
        }
      });

      bucket.contactedLeads = bucketContacted.size;
      if (bucket.connectedCalls > 0) {
        bucket.qualityTimeSeconds = Math.round(bucket.totalTalkTimeSeconds / bucket.connectedCalls);
      }
    });

    res.json({
      success: true,
      range,
      summary,
      bars: buckets
    });

  } catch (error) {
    console.error("Error in getAnalytics:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getBucketDetails = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { start, end, label } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "Start and end dates are required" });
    }

    // Fetch BOT Leads
    const [botLeadsRows] = await db.query(
      `SELECT id, created_at, 
        COALESCE(NULLIF(status3, ''), NULLIF(status2, ''), NULLIF(status1, ''), 'Pending') as current_status,
        (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC') as is_rdykyc
       FROM working_sheet 
       WHERE telecaller_id = ? AND created_at >= ? AND created_at < ?`,
      [telecallerId, start, end]
    );

    // Fetch DIRECT Leads
    const [directLeadsRows] = await db.query(
      `SELECT id, created_at, 
        COALESCE(NULLIF(status3, ''), NULLIF(status2, ''), NULLIF(status1, ''), 'Pending') as current_status,
        (status1 = 'RdyKYC' OR status2 = 'RdyKYC' OR status3 = 'RdyKYC') as is_rdykyc
       FROM direct_leads 
       WHERE telecaller_id = ? AND created_at >= ? AND created_at < ?`,
      [telecallerId, start, end]
    );

    // Fetch CALL LOGS
    const [callLogsRows] = await db.query(
      `SELECT id, original_lead_name, lead_type, contact_last10, call_started_at, duration_seconds, call_type, lead_id
       FROM callpulse_call_logs 
       WHERE telecaller_id = ? AND call_started_at >= ? AND call_started_at < ?
       ORDER BY call_started_at DESC`,
      [telecallerId, start, end]
    );

    const details = {
      totalLeads: botLeadsRows.length + directLeadsRows.length,
      botLeads: botLeadsRows.length,
      directLeads: directLeadsRows.length,
      contactedLeads: 0,
      totalCalls: callLogsRows.length,
      connectedCalls: 0,
      missedRejectedCalls: 0,
      totalTalkTimeSeconds: 0,
      averageQualityTimeSeconds: 0,
      readyToKycLeads: 0
    };

    const statusMap = {};
    const contactedSet = new Set();
    const recentCalls = [];

    callLogsRows.forEach(call => {
      const isConnected = ['INCOMING', 'OUTGOING'].includes(call.call_type) && call.duration_seconds > 0;
      
      if (isConnected) {
        details.connectedCalls++;
        details.totalTalkTimeSeconds += call.duration_seconds;
        contactedSet.add(`${call.lead_type}_${call.lead_id}`);
      } else {
        details.missedRejectedCalls++;
      }

      if (recentCalls.length < 20) {
        recentCalls.push({
          leadName: call.original_lead_name || 'Unknown',
          leadType: call.lead_type,
          number: call.contact_last10,
          callType: call.call_type,
          durationSeconds: call.duration_seconds,
          callStartedAt: call.call_started_at
        });
      }
    });

    details.contactedLeads = contactedSet.size;
    if (details.connectedCalls > 0) {
      details.averageQualityTimeSeconds = Math.round(details.totalTalkTimeSeconds / details.connectedCalls);
    }

    const allLeads = [...botLeadsRows, ...directLeadsRows];
    allLeads.forEach(lead => {
      if (lead.is_rdykyc) details.readyToKycLeads++;
      
      const status = lead.current_status;
      if (!statusMap[status]) statusMap[status] = 0;
      statusMap[status]++;
    });

    const statusBreakdown = Object.keys(statusMap).map(k => ({
      status: k,
      count: statusMap[k]
    })).sort((a,b) => b.count - a.count);

    res.json({
      success: true,
      bucket: {
        label: label || "Selected Range",
        start,
        end
      },
      details,
      statusBreakdown,
      recentCalls
    });

  } catch (error) {
    console.error("Error in getBucketDetails:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
