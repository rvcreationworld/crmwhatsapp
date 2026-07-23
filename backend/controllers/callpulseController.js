const db = require("../config/db");

// Helper for correct IST date ranges converted to UTC for MySQL
function getDateRangeFilter(period, fromDate, toDate) {
  let start = null;
  let end = null;
  let useHalfOpen = true;

  const now = new Date();
  
  function getISTDateString(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }

  function toUTCMySQL(istDateStr) {
    // istDateStr is YYYY-MM-DD
    // We treat it as midnight IST:
    const d = new Date(istDateStr + 'T00:00:00+05:30');
    if (isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return d.getUTCFullYear() + '-' +
           pad(d.getUTCMonth() + 1) + '-' +
           pad(d.getUTCDate()) + ' ' +
           pad(d.getUTCHours()) + ':' +
           pad(d.getUTCMinutes()) + ':' +
           pad(d.getUTCSeconds());
  }

  if (period && period !== 'custom') {
    if (period === 'today') {
      start = toUTCMySQL(getISTDateString(now));
      const tom = new Date(now); tom.setDate(tom.getDate() + 1);
      end = toUTCMySQL(getISTDateString(tom));
    } else if (period === 'yesterday') {
      end = toUTCMySQL(getISTDateString(now));
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      start = toUTCMySQL(getISTDateString(yest));
    } else if (period === 'weekly') {
      const tom = new Date(now); tom.setDate(tom.getDate() + 1);
      end = toUTCMySQL(getISTDateString(tom));
      const w = new Date(now); w.setDate(w.getDate() - w.getDay() + (w.getDay() === 0 ? -6 : 1));
      start = toUTCMySQL(getISTDateString(w));
    } else if (period === 'monthly' || period === 'current_month') {
      const pad = (n) => String(n).padStart(2, '0');
      // For current_month, end is current time. toUTCMySQL returns UTC string. 
      // But we just need a current time in UTC string format for MySQL.
      const currentUTC = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) + ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds());
      end = currentUTC; 
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      start = toUTCMySQL(getISTDateString(m));
    } else if (period === 'past_month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
      end = toUTCMySQL(getISTDateString(m));
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of past month
      start = toUTCMySQL(getISTDateString(pm));
    }
  } else {
    // Custom date range
    if (fromDate) start = toUTCMySQL(fromDate);
    if (toDate) {
      const d = new Date(toDate + 'T00:00:00+05:30');
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        const pad = (n) => String(n).padStart(2, '0');
        end = d.getUTCFullYear() + '-' +
              pad(d.getUTCMonth() + 1) + '-' +
              pad(d.getUTCDate()) + ' ' +
              pad(d.getUTCHours()) + ':' +
              pad(d.getUTCMinutes()) + ':' +
              pad(d.getUTCSeconds());
      } else {
        useHalfOpen = false;
        end = `${toDate} 23:59:59`;
      }
    }
  }

  return { start, end, useHalfOpen };
}

exports.getMyLeadNumbers = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    
    console.log("MY_LEAD_NUMBERS HIT");
    console.log("telecaller_id:", telecallerId);

    // Fetch BOT leads
    const [botLeads] = await db.query(
      `SELECT 
        'BOT' AS lead_type, 
        id AS lead_id, 
        lead_name, 
        lead_contact, 
        COALESCE(contact_last10, RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10)) AS contact_last10,
        3 AS source_priority
       FROM working_sheet 
       WHERE telecaller_id = ?`, 
      [telecallerId]
    );

    // Fetch DIRECT leads
    const [directLeads] = await db.query(
      `SELECT 
        'DIRECT' AS lead_type, 
        id AS lead_id, 
        lead_name, 
        lead_contact, 
        COALESCE(contact_last10, RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10)) AS contact_last10,
        2 AS source_priority
       FROM direct_leads 
       WHERE telecaller_id = ?`, 
      [telecallerId]
    );

    // Fetch FREE leads
    const [freeLeads] = await db.query(
      `SELECT 
        'FREE' AS lead_type, 
        id AS lead_id, 
        lead_name, 
        lead_contact, 
        COALESCE(contact_last10, RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10)) AS contact_last10,
        1 AS source_priority
       FROM free_leads 
       WHERE current_telecaller_id = ? AND free_status IN ('ASSIGNED', 'COMPLETED')`, 
      [telecallerId]
    );
    // Fetch TRANSFERRED leads
    const [transferredLeads] = await db.query(
      `SELECT 
        'TRANSFERRED' AS lead_type, 
        id AS lead_id, 
        lead_name, 
        lead_contact, 
        COALESCE(contact_last10, RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10)) AS contact_last10,
        1 AS source_priority
       FROM transferred_leads 
       WHERE current_telecaller_id = ? AND transfer_status IN ('ASSIGNED', 'COMPLETED')`, 
      [telecallerId]
    );

    const allLeads = [...freeLeads, ...directLeads, ...botLeads, ...transferredLeads];
    const dedupedMap = new Map();
    let duplicatesRemoved = 0;

    for (const lead of allLeads) {
      if (!lead.contact_last10) continue;
      if (dedupedMap.has(lead.contact_last10)) {
        const existing = dedupedMap.get(lead.contact_last10);
        if (lead.source_priority < existing.source_priority) {
          dedupedMap.set(lead.contact_last10, lead);
          duplicatesRemoved++;
        } else {
          duplicatesRemoved++;
        }
      } else {
        dedupedMap.set(lead.contact_last10, lead);
      }
    }

    const result = Array.from(dedupedMap.values());
    result.sort((a, b) => a.source_priority - b.source_priority);

    console.log("BOT count (raw):", botLeads.length);
    console.log("DIRECT count (raw):", directLeads.length);
    console.log("FREE count (raw):", freeLeads.length);
    console.log("TRANSFERRED count (raw):", transferredLeads.length);
    console.log("Duplicates removed:", duplicatesRemoved);
    console.log("TOTAL (deduped):", result.length);

    res.json(result);
  } catch (error) {
    console.error("getMyLeadNumbers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

function toMySQLDateTime(value) {
  if (!value) return null;

  // Handle YYYY-MM-DD HH:mm:ss already formatted
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return value;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  const pad = (n) => String(n).padStart(2, '0');

  // Convert strictly to UTC for MySQL storage (matching timezone: 'Z' in db config)
  return (
    date.getUTCFullYear() + '-' +
    pad(date.getUTCMonth() + 1) + '-' +
    pad(date.getUTCDate()) + ' ' +
    pad(date.getUTCHours()) + ':' +
    pad(date.getUTCMinutes()) + ':' +
    pad(date.getUTCSeconds())
  );
}

exports.uploadLogs = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    let logs = [];

    console.log("--- CALLPULSE LOG UPLOAD HIT ---");
    console.log("loggedInTelecallerId:", telecallerId);
    console.log("raw body keys:", Object.keys(req.body));

    if (Array.isArray(req.body)) {
      logs = req.body;
    } else if (req.body && Array.isArray(req.body.logs)) {
      logs = req.body.logs;
    } else if (req.body && Array.isArray(req.body.data)) {
      logs = req.body.data;
    } else if (req.body && Array.isArray(req.body.callLogs)) {
      logs = req.body.callLogs;
    } else if (req.body && typeof req.body === 'object' && req.body.lead_id) {
      // Single log object
      logs = [req.body];
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payload, expected array of logs, { logs: [...] }, or a single log object' 
      });
    }

    console.log("parsed logs count:", logs.length);

    if (!logs.length) {
      return res.json({ success: true, received: 0, inserted: 0, duplicates: 0, failed: 0, failedItems: [] });
    }

    let insertedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let failedItems = [];
    let skippedItems = [];
    let breakdown = { BOT: 0, DIRECT: 0, FREE: 0, TRANSFERRED: 0 };
    
    for (const rawLog of logs) {
      console.log("parsed log:", rawLog);

      let lead_type = (rawLog.lead_type || rawLog.leadType || '').toString().trim().toUpperCase();
      const lead_id = parseInt(rawLog.lead_id || rawLog.leadId, 10) || null;
      const dialed_number = rawLog.dialed_number || rawLog.dialedNumber;
      const normalized_number = rawLog.normalized_number || rawLog.normalizedNumber;
      const call_type = rawLog.call_type || rawLog.callType;
      
      const device_call_log_id = rawLog.device_call_log_id || rawLog.deviceCallLogId || null;
      const raw_phone_number = rawLog.raw_phone_number || rawLog.rawPhoneNumber || dialed_number;
      const app_call_source = rawLog.app_call_source || rawLog.appCallSource || 'UNKNOWN';

      const rawStarted = rawLog.call_started_at || rawLog.callStartedAt;
      const rawEnded = rawLog.call_ended_at || rawLog.callEndedAt;

      const call_started_at = toMySQLDateTime(rawStarted);
      const call_ended_at = toMySQLDateTime(rawEnded);
      const duration_seconds = parseInt(rawLog.duration_seconds || rawLog.durationSeconds || 0, 10);
      
      // Basic field validation (relaxed for unknown calls)
      if (!normalized_number || !call_type || !rawStarted) {
        failedCount++;
        failedItems.push({
          lead_type, lead_id, normalized_number,
          reason: "Missing required fields (normalized_number, call_type, call_started_at)"
        });
        continue;
      }

      if (!call_started_at) {
        failedCount++;
        failedItems.push({
          lead_type, lead_id, normalized_number,
          reason: "Invalid call_started_at format"
        });
        continue;
      }

      let dbLeadId = null;
  
      if (lead_type === 'BOT') {
        // First try to match by lead_id explicitly if provided
        if (lead_id) {
          const [botCheckId] = await db.query(
            "SELECT id FROM working_sheet WHERE id = ? AND telecaller_id = ?",
            [lead_id, telecallerId]
          );
          if (botCheckId.length > 0) {
            dbLeadId = botCheckId[0].id;
          }
        }
        
        // If not matched by lead_id, try by normalized_number
        if (!dbLeadId && normalized_number) {
          const [botCheckNum] = await db.query(
            "SELECT id FROM working_sheet WHERE telecaller_id = ? AND (RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10) = ? OR lead_contact LIKE ?)",
            [telecallerId, normalized_number, `%${normalized_number}`]
          );
          if (botCheckNum.length > 0) {
            dbLeadId = botCheckNum[0].id;
          }
        }
      } else if (lead_type === 'DIRECT') {
        // First try to match by lead_id explicitly if provided
        if (lead_id) {
          const [directCheckId] = await db.query(
            "SELECT id FROM direct_leads WHERE id = ? AND telecaller_id = ?",
            [lead_id, telecallerId]
          );
          if (directCheckId.length > 0) {
            dbLeadId = directCheckId[0].id;
          }
        }
        
        // If not matched by lead_id, try by normalized_number
        if (!dbLeadId && normalized_number) {
          const [directCheckNum] = await db.query(
            "SELECT id FROM direct_leads WHERE telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
            [telecallerId, normalized_number, `%${normalized_number}`]
          );
          if (directCheckNum.length > 0) {
            dbLeadId = directCheckNum[0].id;
          }
        }
      } else if (lead_type === 'FREE') {
        if (lead_id) {
          const [freeCheckId] = await db.query(
            "SELECT id FROM free_leads WHERE id = ? AND current_telecaller_id = ?",
            [lead_id, telecallerId]
          );
          if (freeCheckId.length > 0) {
            dbLeadId = freeCheckId[0].id;
          }
        }
        
        if (!dbLeadId && normalized_number) {
          const [freeCheckNum] = await db.query(
            "SELECT id FROM free_leads WHERE current_telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
            [telecallerId, normalized_number, `%${normalized_number}`]
          );
          if (freeCheckNum.length > 0) {
            dbLeadId = freeCheckNum[0].id;
          }
        }
      } else if (lead_type === 'TRANSFERRED') {
        if (lead_id) {
          const [transCheckId] = await db.query(
            "SELECT id FROM transferred_leads WHERE id = ? AND current_telecaller_id = ?",
            [lead_id, telecallerId]
          );
          if (transCheckId.length > 0) {
            dbLeadId = transCheckId[0].id;
          }
        }
        
        if (!dbLeadId && normalized_number) {
          const [transCheckNum] = await db.query(
            "SELECT id FROM transferred_leads WHERE current_telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
            [telecallerId, normalized_number, `%${normalized_number}`]
          );
          if (transCheckNum.length > 0) {
            dbLeadId = transCheckNum[0].id;
          }
        }
      }

      // If still not matched, check across both tables
      // If still not matched, check across both tables
      if (!dbLeadId && normalized_number) {
        const [freeCheckNum] = await db.query(
          "SELECT id FROM free_leads WHERE current_telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
          [telecallerId, normalized_number, `%${normalized_number}`]
        );
        if (freeCheckNum.length > 0) {
          dbLeadId = freeCheckNum[0].id;
          lead_type = 'FREE';
        } else {
          const [directCheckNum] = await db.query(
            "SELECT id FROM direct_leads WHERE telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
            [telecallerId, normalized_number, `%${normalized_number}`]
          );
          if (directCheckNum.length > 0) {
            dbLeadId = directCheckNum[0].id;
            lead_type = 'DIRECT';
          } else {
            const [botCheckNum] = await db.query(
              "SELECT id FROM working_sheet WHERE telecaller_id = ? AND (RIGHT(REGEXP_REPLACE(lead_contact, '[^0-9]', ''), 10) = ? OR lead_contact LIKE ?)",
              [telecallerId, normalized_number, `%${normalized_number}`]
            );
            if (botCheckNum.length > 0) {
              dbLeadId = botCheckNum[0].id;
              lead_type = 'BOT';
            } else {
              const [transCheckNum] = await db.query(
                "SELECT id FROM transferred_leads WHERE current_telecaller_id = ? AND (contact_last10 = ? OR lead_contact LIKE ?)",
                [telecallerId, normalized_number, `%${normalized_number}`]
              );
              if (transCheckNum.length > 0) {
                dbLeadId = transCheckNum[0].id;
                lead_type = 'TRANSFERRED';
              }
            }
          }
        }
      }

      // Privacy gate: Never save unmatched personal numbers
      if (!dbLeadId) {
        skippedCount++;
        skippedItems.push({
          normalized_number,
          reason: "Unmatched personal or non-CRM call"
        });
        console.log(`Skipped unmatched personal call: ${normalized_number}`);
        continue;
      }

      console.log(`Validation completed for ${lead_type} ${dbLeadId}`);

      try {
        const [result] = await db.query(
          `INSERT INTO callpulse_call_logs 
           (telecaller_id, lead_type, lead_id, dialed_number, normalized_number, call_type, call_started_at, call_ended_at, duration_seconds, sync_status, synced_at, device_call_log_id, raw_phone_number, app_call_source) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', NOW(), ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           call_type = VALUES(call_type),
           duration_seconds = VALUES(duration_seconds),
           call_ended_at = VALUES(call_ended_at),
           device_call_log_id = IFNULL(VALUES(device_call_log_id), device_call_log_id),
           app_call_source = IF(app_call_source = 'UNKNOWN', VALUES(app_call_source), app_call_source),
           synced_at = NOW()`,
          [telecallerId, lead_type, dbLeadId, dialed_number, normalized_number, call_type, call_started_at, call_ended_at, duration_seconds, device_call_log_id, raw_phone_number, app_call_source]
        );
        
        if (result.insertId) {
          insertedCount++;
          if (breakdown[lead_type] !== undefined) {
            breakdown[lead_type]++;
          } else {
            breakdown[lead_type] = 1;
          }
          console.log(`SQL insert result: Success for ${lead_type} ${dbLeadId}`);
        } else {
          duplicateCount++;
          console.log(`SQL update result: Duplicate resolved for ${lead_type} ${dbLeadId}`);
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          duplicateCount++;
          console.log(`SQL dup entry error resolved for ${lead_type} ${dbLeadId}`);
        } else {
          failedCount++;
          failedItems.push({
            lead_type, lead_id, normalized_number,
            reason: `Database error: ${err.message}`
          });
          console.error("Error inserting log:", err);
        }
      }
    }

    // If it was a single log request, return the exact requested format
    if (logs.length === 1) {
      if (duplicateCount === 1) {
        return res.json({ success: true, inserted: false, duplicate: true, breakdown });
      } else if (insertedCount === 1) {
        return res.json({ success: true, inserted: true, breakdown });
      } else if (skippedCount === 1) {
        return res.json({ success: true, inserted: false, skipped: true, reason: "Unmatched personal call", breakdown });
      } else {
        return res.json({ success: false, inserted: false, reason: failedItems[0]?.reason, breakdown });
      }
    }

    // Bulk upload response
    return res.json({
      success: true,
      received: logs.length,
      imported_count: insertedCount,
      duplicate_count: duplicateCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      inserted: insertedCount, // Keep legacy fields for older apps
      duplicates: duplicateCount,
      skipped: skippedCount,
      failed: failedCount,
      breakdown,
      failedItems
    });
  } catch (error) {
    console.error("uploadLogs error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getDebugRecentLogs = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM callpulse_call_logs ORDER BY id DESC LIMIT 20");
    res.json(rows);
  } catch (error) {
    console.error("getDebugRecentLogs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdminSummary = async (req, res) => {
  try {
    const { fromDate, toDate, period } = req.query;
    
    console.log("[CALL_LOGS_REQUEST]", {
      functionName: "getAdminSummary",
      role: req.user?.role,
      userId: req.user?.id,
      telecallerId: req.user?.telecaller_id,
      queryTelecallerId: req.query.telecaller_id || req.query.telecallerId,
      period
    });

    let effectiveTelecallerId = req.query.telecallerId || req.query.telecaller_id;

    if (req.user && req.user.role === 'TELECALLER') {
      effectiveTelecallerId = req.user.telecaller_id || req.user.id;
    }

    let query = `
      SELECT c.telecaller_id, 
             t.telecaller_name, 
             t.tele_mobile,
             COUNT(c.id) as total_calls,
             SUM(CASE WHEN c.call_type = 'OUTGOING' THEN 1 ELSE 0 END) as outgoing_calls,
             SUM(CASE WHEN c.call_type = 'INCOMING' THEN 1 ELSE 0 END) as incoming_calls,
             SUM(CASE WHEN c.call_type = 'MISSED' THEN 1 ELSE 0 END) as missed_calls,
             SUM(CASE WHEN c.call_type = 'REJECTED' THEN 1 ELSE 0 END) as rejected_calls,
             SUM(c.duration_seconds) as total_duration,
             MIN(c.call_started_at) as first_call_time,
             MAX(c.call_started_at) as last_call_time,
             SUM(CASE WHEN c.lead_type = 'BOT' THEN 1 ELSE 0 END) as bot_lead_calls,
             SUM(CASE WHEN c.lead_type = 'DIRECT' THEN 1 ELSE 0 END) as direct_lead_calls,
             SUM(CASE WHEN c.lead_type = 'FREE' THEN 1 ELSE 0 END) as free_lead_calls
      FROM callpulse_call_logs c
      JOIN telecaller_master t ON c.telecaller_id = t.id
      WHERE 1=1
    `;
    const params = [];

    const { start, end, useHalfOpen } = getDateRangeFilter(period, fromDate, toDate);

    console.log("getAdminSummary Date Range:", { start, end, useHalfOpen });

    if (start) {
      query += ` AND c.call_started_at >= ?`;
      params.push(start);
    }
    if (end) {
      if (useHalfOpen) {
        query += ` AND c.call_started_at < ?`;
      } else {
        query += ` AND c.call_started_at <= ?`;
      }
      params.push(end);
    }
    if (effectiveTelecallerId) {
      query += ` AND c.telecaller_id = ?`;
      params.push(effectiveTelecallerId);
    }

    query += ` GROUP BY c.telecaller_id, t.telecaller_name, t.tele_mobile`;

    const [summary] = await db.query(query, params);
    res.json(summary);
  } catch (error) {
    console.error("getAdminSummary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdminLogs = async (req, res) => {
  try {
    const { fromDate, toDate, callType, leadType, period } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log("[CALL_LOGS_REQUEST]", {
      functionName: "getAdminLogs",
      role: req.user?.role,
      userId: req.user?.id,
      telecallerId: req.user?.telecaller_id,
      queryTelecallerId: req.query.telecaller_id || req.query.telecallerId,
      period
    });

    let effectiveTelecallerId = req.query.telecallerId || req.query.telecaller_id;

    if (req.user && req.user.role === 'TELECALLER') {
      effectiveTelecallerId = req.user.telecaller_id || req.user.id;
    }

    let query = `
      SELECT c.*, 
             t.telecaller_name,
             COALESCE(fl_by_id.lead_name, dl_by_id.lead_name, ws_by_id.lead_name, fl_by_number.lead_name, dl_by_number.lead_name, ws_by_number.lead_name, 'Unknown') AS lead_name,
             COALESCE(fl_by_id.lead_contact, dl_by_id.lead_contact, ws_by_id.lead_contact, fl_by_number.lead_contact, dl_by_number.lead_contact, ws_by_number.lead_contact, c.dialed_number, c.normalized_number) AS lead_contact
      FROM callpulse_call_logs c
      JOIN telecaller_master t ON c.telecaller_id = t.id
      LEFT JOIN free_leads fl_by_id
        ON c.lead_type = 'FREE' AND c.lead_id = fl_by_id.id AND c.telecaller_id = fl_by_id.current_telecaller_id
      LEFT JOIN direct_leads dl_by_id
        ON c.lead_type = 'DIRECT' AND c.lead_id = dl_by_id.id AND c.telecaller_id = dl_by_id.telecaller_id
      LEFT JOIN working_sheet ws_by_id
        ON c.lead_type = 'BOT' AND c.lead_id = ws_by_id.id AND c.telecaller_id = ws_by_id.telecaller_id
      LEFT JOIN free_leads fl_by_number
        ON c.telecaller_id = fl_by_number.current_telecaller_id AND c.normalized_number = fl_by_number.contact_last10 COLLATE utf8mb4_unicode_ci
      LEFT JOIN direct_leads dl_by_number
        ON c.telecaller_id = dl_by_number.telecaller_id AND c.normalized_number = dl_by_number.contact_last10
      LEFT JOIN working_sheet ws_by_number
        ON c.telecaller_id = ws_by_number.telecaller_id AND c.normalized_number = RIGHT(REGEXP_REPLACE(ws_by_number.lead_contact, '[^0-9]', ''), 10)
      WHERE 1=1
    `;
    const params = [];

    const { start, end, useHalfOpen } = getDateRangeFilter(period, fromDate, toDate);

    console.log("getAdminLogs Date Range:", { start, end, useHalfOpen });

    if (start) {
      query += ` AND c.call_started_at >= ?`;
      params.push(start);
    }
    if (end) {
      if (useHalfOpen) {
        query += ` AND c.call_started_at < ?`;
      } else {
        query += ` AND c.call_started_at <= ?`;
      }
      params.push(end);
    }
    if (effectiveTelecallerId) {
      query += ` AND c.telecaller_id = ?`;
      params.push(effectiveTelecallerId);
    }
    if (callType && callType !== 'All') {
      query += ` AND c.call_type = ?`;
      params.push(callType);
    }
    if (leadType && leadType !== 'All') {
      query += ` AND c.lead_type = ?`;
      params.push(leadType);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0].total;

    query += ` ORDER BY c.call_started_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(query, params);

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("getAdminLogs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTelecallerSummary = async (req, res) => {
  req.query.telecallerId = req.user.id;
  return exports.getAdminSummary(req, res);
};

exports.getTelecallerLogs = async (req, res) => {
  req.query.telecallerId = req.user.id;
  return exports.getAdminLogs(req, res);
};

exports.getLeadCallHistory = async (req, res) => {
  try {
    const { leadType, leadId } = req.query;
    if (!leadType || !leadId) return res.status(400).json({ message: "Missing leadType or leadId" });

    let table = 'working_sheet';
    let telecallerCol = 'telecaller_id';
    
    if (leadType === 'DIRECT') {
      table = 'direct_leads';
    } else if (leadType === 'FREE') {
      table = 'free_leads';
      telecallerCol = 'current_telecaller_id';
    }

    const [leadRecord] = await db.query(`SELECT ${telecallerCol} as telecaller_id, lead_contact FROM ${table} WHERE id = ?`, [leadId]);

    if (!leadRecord.length) {
      return res.json([]);
    }

    const leadInfo = leadRecord[0];
    const telecallerId = leadInfo.telecaller_id;
    // Extract last 10 digits
    const normalizedNumber = (leadInfo.lead_contact || '').replace(/[^0-9]/g, '').slice(-10);

    let query = `
      SELECT c.* 
      FROM callpulse_call_logs c
      WHERE (
        (c.lead_type = ? AND c.lead_id = ?) 
        OR 
        (c.telecaller_id = ? AND c.normalized_number = ?)
      )
    `;
    let params = [leadType, leadId, telecallerId, normalizedNumber];

    // If telecaller, restrict to their own
    if (req.user.role === 'TELECALLER') {
      query += " AND c.telecaller_id = ?";
      params.push(req.user.id);
    }

    query += " ORDER BY c.call_started_at DESC";

    const [rows] = await db.query(query, params);
    
    // Remove duplicates based on ID if the OR condition matched both (though DB shouldn't return duplicates in standard SELECT)
    const uniqueRows = Array.from(new Map(rows.map(item => [item.id, item])).values());
    res.json(uniqueRows);
  } catch (error) {
    console.error("getLeadCallHistory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.registerAgent = async (req, res) => {
  try {
    const { device_id, device_name, app_version, api_base_url } = req.body;
    const telecaller_id = req.user.id;
    const [existing] = await db.query('SELECT id FROM callpulse_agents WHERE telecaller_id = ? AND device_id = ?', [telecaller_id, device_id]);
    if (existing.length > 0) {
      await db.query('UPDATE callpulse_agents SET device_name=?, app_version=?, api_base_url=?, last_login_at=NOW(), last_seen_at=NOW() WHERE id=?', [device_name, app_version, api_base_url, existing[0].id]);
    } else {
      await db.query('INSERT INTO callpulse_agents (telecaller_id, device_id, device_name, app_version, api_base_url, last_login_at, last_seen_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())', [telecaller_id, device_id, device_name, app_version, api_base_url]);
    }
    res.json({ message: 'Agent registered' });
  } catch (error) {
    console.error('registerAgent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.agentHeartbeat = async (req, res) => {
  try {
    const { device_id } = req.body;
    const telecaller_id = req.user.id;
    await db.query('UPDATE callpulse_agents SET last_seen_at=NOW() WHERE telecaller_id=? AND device_id=?', [telecaller_id, device_id]);
    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAdminAgentsSummary = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    // Default to 'today' if not provided
    const effectivePeriod = period || 'today';
    const { start, end, useHalfOpen } = getDateRangeFilter(effectivePeriod, startDate, endDate);
    
    let timeCondition = "1=1";
    let timeParams = [];
    if (start) {
      timeCondition += ` AND call_started_at >= ?`;
      timeParams.push(start);
    }
    if (end) {
      timeCondition += useHalfOpen ? ` AND call_started_at < ?` : ` AND call_started_at <= ?`;
      timeParams.push(end);
    }

    // Call Logs aggregation
    const callLogsQuery = `
      SELECT telecaller_id,
             COUNT(id) as total_dial,
             COUNT(DISTINCT normalized_number) as unique_dial,
             COALESCE(SUM(duration_seconds), 0) as total_duration_seconds
      FROM callpulse_call_logs
      WHERE ${timeCondition}
      GROUP BY telecaller_id
    `;
    const [callLogsStats] = await db.query(callLogsQuery, timeParams);

    // Leads Taken aggregations
    let leadTimeCond = "1=1";
    let leadTimeParams = [];
    if (start) {
      leadTimeCond += ` AND created_at >= ?`;
      leadTimeParams.push(start);
    }
    if (end) {
      leadTimeCond += useHalfOpen ? ` AND created_at < ?` : ` AND created_at <= ?`;
      leadTimeParams.push(end);
    }

    const [directLeadsStats] = await db.query(`
      SELECT telecaller_id, COUNT(*) as direct_leads_taken 
      FROM direct_leads 
      WHERE ${leadTimeCond}
      GROUP BY telecaller_id
    `, leadTimeParams);

    const [poolLeadsStats] = await db.query(`
      SELECT telecaller_id, COUNT(*) as pool_leads_taken 
      FROM working_sheet 
      WHERE ${leadTimeCond}
      GROUP BY telecaller_id
    `, leadTimeParams);

    // Free leads
    let freeTimeCond = "1=1";
    let freeTimeParams = [];
    if (start) {
      freeTimeCond += ` AND fetched_at >= ?`;
      freeTimeParams.push(start);
    }
    if (end) {
      freeTimeCond += useHalfOpen ? ` AND fetched_at < ?` : ` AND fetched_at <= ?`;
      freeTimeParams.push(end);
    }
    const [freeLeadsStats] = await db.query(`
      SELECT current_telecaller_id as telecaller_id, COUNT(*) as free_leads_taken 
      FROM free_leads 
      WHERE ${freeTimeCond}
      GROUP BY current_telecaller_id
    `, freeTimeParams);

    // Transferred leads
    let transTimeCond = "1=1";
    let transTimeParams = [];
    if (start) {
      transTimeCond += ` AND transferred_at >= ?`;
      transTimeParams.push(start);
    }
    if (end) {
      transTimeCond += useHalfOpen ? ` AND transferred_at < ?` : ` AND transferred_at <= ?`;
      transTimeParams.push(end);
    }
    const [transLeadsStats] = await db.query(`
      SELECT current_telecaller_id as telecaller_id, COUNT(*) as transferred_leads_taken 
      FROM transferred_leads 
      WHERE ${transTimeCond}
      GROUP BY current_telecaller_id
    `, transTimeParams);

    // Get all telecallers
    const [telecallers] = await db.query(`SELECT id, telecaller_name, tele_mobile FROM telecaller_master WHERE is_active = 1 AND is_deleted = 0`);

    const result = telecallers.map(t => {
      const calls = callLogsStats.find(c => c.telecaller_id === t.id) || { total_dial: 0, unique_dial: 0, total_duration_seconds: 0 };
      const directs = directLeadsStats.find(d => d.telecaller_id === t.id) || { direct_leads_taken: 0 };
      const pools = poolLeadsStats.find(p => p.telecaller_id === t.id) || { pool_leads_taken: 0 };
      const frees = freeLeadsStats.find(f => f.telecaller_id === t.id) || { free_leads_taken: 0 };
      const transfers = transLeadsStats.find(tr => tr.telecaller_id === t.id) || { transferred_leads_taken: 0 };

      return {
        telecaller_id: t.id,
        telecaller_name: t.telecaller_name,
        tele_mobile: t.tele_mobile,
        total_dial: calls.total_dial,
        unique_dial: calls.unique_dial,
        total_duration_seconds: calls.total_duration_seconds,
        total_direct_leads_taken: directs.direct_leads_taken,
        total_pool_leads_taken: pools.pool_leads_taken,
        total_free_leads_taken: frees.free_leads_taken,
        total_transferred_leads_taken: transfers.transferred_leads_taken,
        clickable: true
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("getAdminAgentsSummary error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdminAgentDetails = async (req, res) => {
  try {
    const { telecallerId } = req.params;
    const { period, startDate, endDate } = req.query;
    
    const effectivePeriod = period || 'today';
    // Removed the restriction for current_month as requested by user

    const { start, end, useHalfOpen } = getDateRangeFilter(effectivePeriod, startDate, endDate);

    let leadTimeCond = "1=1";
    let leadTimeParams = [];
    if (start) {
      leadTimeCond += ` AND created_at >= ?`;
      leadTimeParams.push(start);
    }
    if (end) {
      leadTimeCond += useHalfOpen ? ` AND created_at < ?` : ` AND created_at <= ?`;
      leadTimeParams.push(end);
    }

    const [directLeads] = await db.query(`SELECT status1, status2, status3 FROM direct_leads WHERE telecaller_id = ? AND ${leadTimeCond}`, [telecallerId, ...leadTimeParams]);
    const [workingSheetLeads] = await db.query(`SELECT status1, status2, status3 FROM working_sheet WHERE telecaller_id = ? AND ${leadTimeCond}`, [telecallerId, ...leadTimeParams]);

    const combinedLeads = [...directLeads, ...workingSheetLeads];

    let freeTimeCond = "1=1";
    let freeTimeParams = [];
    if (start) {
      freeTimeCond += ` AND fetched_at >= ?`;
      freeTimeParams.push(start);
    }
    if (end) {
      freeTimeCond += useHalfOpen ? ` AND fetched_at < ?` : ` AND fetched_at <= ?`;
      freeTimeParams.push(end);
    }
    const [freeLeads] = await db.query(`SELECT status4 FROM free_leads WHERE current_telecaller_id = ? AND ${freeTimeCond}`, [telecallerId, ...freeTimeParams]);

    let transTimeCond = "1=1";
    let transTimeParams = [];
    if (start) {
      transTimeCond += ` AND transferred_at >= ?`;
      transTimeParams.push(start);
    }
    if (end) {
      transTimeCond += useHalfOpen ? ` AND transferred_at < ?` : ` AND transferred_at <= ?`;
      transTimeParams.push(end);
    }
    const [transferredLeads] = await db.query(`SELECT status4 FROM transferred_leads WHERE current_telecaller_id = ? AND ${transTimeCond}`, [telecallerId, ...transTimeParams]);

    const normalizeStatus = (status) => {
      if (!status || status.trim() === '') return 'Status Not Updated';
      const s = status.trim().toLowerCase();
      if (s === 'none') return 'Status Not Updated';
      if (s === 'think&lmk' || s === 'think & lmk' || s === 'think lmk') return 'Think&LMK';
      if (s === 'ready kyc' || s === 'rdykyc' || s === 'rdy kyc') return 'RdyKYC';
      if (s === 'not int' || s === 'not interested') return 'Not Int';
      if (s === 'wrong no' || s === 'wrong number') return 'Wrong No';
      if (s === 'call back' || s === 'callback') return 'Call Back';
      if (s === 'not conn' || s === 'not connected') return 'Not Conn';
      if (s === 'ringing') return 'Ringing';
      if (s === 'info given') return 'Info Given';
      if (s === 'int angel' || s === 'interested angel' || s === 'interested') return 'Int Angel';
      return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const countStatuses = (leads, statusField) => {
      const counts = {};
      leads.forEach(lead => {
        const status = normalizeStatus(lead[statusField]);
        if (status !== 'Status Not Updated') {
          counts[status] = (counts[status] || 0) + 1;
        }
      });
      return counts;
    };

    const statusCounts = {};
    statusCounts.status1 = countStatuses(combinedLeads, 'status1');
    
    if (effectivePeriod === 'yesterday' || effectivePeriod === 'past_month' || effectivePeriod === 'custom' || effectivePeriod === 'current_month') {
      statusCounts.status2 = countStatuses(combinedLeads, 'status2');
    }
    
    if (effectivePeriod === 'past_month' || effectivePeriod === 'custom' || effectivePeriod === 'current_month') {
      statusCounts.status3 = countStatuses(combinedLeads, 'status3');
    }

    if (freeLeads.length > 0) {
      statusCounts.freeStatus4 = countStatuses(freeLeads, 'status4');
    }
    
    if (transferredLeads.length > 0) {
      statusCounts.transferredStatus4 = countStatuses(transferredLeads, 'status4');
    }

    res.json({
      success: true,
      period: effectivePeriod,
      status_counts: statusCounts,
      lead_taken_counts: {
        normal_leads: combinedLeads.length,
        direct_leads: directLeads.length,
        bot_leads: workingSheetLeads.length,
        free_leads: freeLeads.length,
        transferred_leads: transferredLeads.length
      }
    });

  } catch (error) {
    console.error("getAdminAgentDetails error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
