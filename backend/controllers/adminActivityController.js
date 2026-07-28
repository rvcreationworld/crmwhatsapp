const db = require('../config/db');

function formatGapLabel(seconds) {
  if (seconds === null || seconds === undefined) return "No calls yet";
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

exports.getLastActivity = async (req, res) => {
  try {
    const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayStr = `${nowIst.getFullYear()}-${String(nowIst.getMonth() + 1).padStart(2, '0')}-${String(nowIst.getDate()).padStart(2, '0')}`;

    const ringingCondition = `(
      (status3 = 'Ringing') OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Ringing') OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Ringing')
    )
    AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) < '${todayStr}'
    AND (status1_timestamp IS NULL OR DATE(CONVERT_TZ(status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status2_timestamp IS NULL OR DATE(CONVERT_TZ(status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status3_timestamp IS NULL OR DATE(CONVERT_TZ(status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;

    const callbackCondition = `(
      (status3 = 'Call Back') OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND status2 = 'Call Back') OR 
      ((status3 IS NULL OR status3 = 'None' OR status3 = '') AND (status2 IS NULL OR status2 = 'None' OR status2 = '') AND status1 = 'Call Back')
    )
    AND DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) < '${todayStr}'
    AND (status1_timestamp IS NULL OR DATE(CONVERT_TZ(status1_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status2_timestamp IS NULL OR DATE(CONVERT_TZ(status2_timestamp, '+00:00', '+05:30')) < '${todayStr}')
    AND (status3_timestamp IS NULL OR DATE(CONVERT_TZ(status3_timestamp, '+00:00', '+05:30')) < '${todayStr}')`;

    const query = `
      SELECT 
        t.id AS telecaller_id, 
        t.telecaller_name, 
        t.tele_mobile,
        (
          SELECT COUNT(*) 
          FROM direct_leads dl
          WHERE dl.telecaller_id = t.id
            AND (dl.is_kyc_done = 0 OR dl.is_kyc_done IS NULL)
            AND (dl.status_lock_type IS NULL OR dl.status_lock_type != 'KYC_DONE')
            AND (dl.status1 IS NULL OR dl.status1 = '')
            AND (dl.is_transferred_lead = 0 OR dl.is_transferred_lead IS NULL)
            AND NOT EXISTS (
              SELECT 1 
              FROM callpulse_call_logs ccl2 
              WHERE ccl2.telecaller_id = dl.telecaller_id
                AND (
                  (ccl2.lead_type = 'DIRECT' AND ccl2.lead_id = dl.id)
                  OR ccl2.normalized_number = dl.contact_last10
                  OR ccl2.normalized_number = RIGHT(dl.lead_contact, 10)
                )
            )
        ) AS untouched_lead_count,
        (
          SELECT COUNT(*) 
          FROM working_sheet wl
          WHERE wl.telecaller_id = t.id
            AND wl.source IN ('BOT_POOL', 'BOT_AUTO_ASSIGN')
            AND (wl.is_kyc_done = 0 OR wl.is_kyc_done IS NULL)
            AND (wl.status_lock_type IS NULL OR wl.status_lock_type != 'KYC_DONE')
            AND MONTH(wl.created_at) = MONTH(CURRENT_DATE())
            AND YEAR(wl.created_at) = YEAR(CURRENT_DATE())
            AND (wl.status1 IS NULL OR wl.status1 = '' OR LOWER(wl.status1) IN ('none', 'new'))
            AND (wl.status2 IS NULL OR wl.status2 = '' OR LOWER(wl.status2) IN ('none', 'new'))
            AND (wl.status3 IS NULL OR wl.status3 = '' OR LOWER(wl.status3) IN ('none', 'new'))
            AND (wl.is_transferred_lead = 0 OR wl.is_transferred_lead IS NULL)
            AND (wl.is_closed_lead = 0 OR wl.is_closed_lead IS NULL)
            AND (wl.is_released_to_free_pool = 0 OR wl.is_released_to_free_pool IS NULL)
            /* AND NOT EXISTS (
              SELECT 1 
              FROM callpulse_call_logs ccl3 
              WHERE ccl3.telecaller_id = wl.telecaller_id
                AND (
                  (ccl3.lead_type = 'BOT' AND ccl3.lead_id = wl.id)
                  OR ccl3.normalized_number = RIGHT(REGEXP_REPLACE(wl.lead_contact, '[^0-9]', ''), 10)
                )
            ) */
        ) AS untouched_bot_lead_count,
        (
          (SELECT COUNT(*) FROM direct_leads dl WHERE dl.telecaller_id = t.id AND (dl.is_kyc_done = 0 OR dl.is_kyc_done IS NULL) AND (dl.is_released_to_free_pool = 0 OR dl.is_released_to_free_pool IS NULL) AND (dl.is_closed_lead = 0 OR dl.is_closed_lead IS NULL) AND (dl.is_transferred_lead = 0 OR dl.is_transferred_lead IS NULL) AND ${ringingCondition})
          +
          (SELECT COUNT(*) FROM working_sheet wl WHERE wl.telecaller_id = t.id AND (wl.is_kyc_done = 0 OR wl.is_kyc_done IS NULL) AND (wl.is_released_to_free_pool = 0 OR wl.is_released_to_free_pool IS NULL) AND (wl.is_closed_lead = 0 OR wl.is_closed_lead IS NULL) AND (wl.is_transferred_lead = 0 OR wl.is_transferred_lead IS NULL) AND ${ringingCondition})
        ) AS ringing_leads_count,
        (
          (SELECT COUNT(*) FROM direct_leads dl WHERE dl.telecaller_id = t.id AND (dl.is_kyc_done = 0 OR dl.is_kyc_done IS NULL) AND (dl.is_released_to_free_pool = 0 OR dl.is_released_to_free_pool IS NULL) AND (dl.is_closed_lead = 0 OR dl.is_closed_lead IS NULL) AND (dl.is_transferred_lead = 0 OR dl.is_transferred_lead IS NULL) AND ${callbackCondition})
          +
          (SELECT COUNT(*) FROM working_sheet wl WHERE wl.telecaller_id = t.id AND (wl.is_kyc_done = 0 OR wl.is_kyc_done IS NULL) AND (wl.is_released_to_free_pool = 0 OR wl.is_released_to_free_pool IS NULL) AND (wl.is_closed_lead = 0 OR wl.is_closed_lead IS NULL) AND (wl.is_transferred_lead = 0 OR wl.is_transferred_lead IS NULL) AND ${callbackCondition})
        ) AS callback_leads_count,
        MAX(ccl.call_started_at) AS last_call_at,
        COUNT(ccl.id) AS total_calls,
        TIMESTAMPDIFF(SECOND, MAX(ccl.call_started_at), UTC_TIMESTAMP()) AS last_call_gap_seconds
      FROM telecaller_master t
      LEFT JOIN callpulse_call_logs ccl ON t.id = ccl.telecaller_id
      WHERE t.is_active = 1 AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
      GROUP BY t.id, t.telecaller_name, t.tele_mobile
      ORDER BY 
        untouched_lead_count DESC,
        CASE WHEN MAX(ccl.call_started_at) IS NULL THEN 0 ELSE 1 END ASC,
        MAX(ccl.call_started_at) ASC
    `;

    const [rows] = await db.query(query);

    const hotLeadsQuery = `
      SELECT hl.telecaller_id, COUNT(*) as hot_leads_count
      FROM (
        SELECT telecaller_id, lead_id, lead_type
        FROM callpulse_call_logs
        GROUP BY telecaller_id, lead_id, lead_type
        HAVING SUM(duration_seconds) >= 300
      ) hl
      LEFT JOIN working_sheet ws ON hl.lead_type = 'BOT' AND hl.lead_id = ws.id
      LEFT JOIN direct_leads dl ON hl.lead_type = 'DIRECT' AND hl.lead_id = dl.id
      LEFT JOIN transferred_leads tl ON hl.lead_type = 'TRANSFERRED' AND hl.lead_id = tl.id
      LEFT JOIN free_leads fl ON hl.lead_type = 'FREE' AND hl.lead_id = fl.id
      WHERE (
        (hl.lead_type = 'BOT' AND ws.id IS NOT NULL AND (ws.status1 NOT IN ('Wrong No', 'Not Int') OR ws.status1 IS NULL) AND (ws.status2 NOT IN ('Wrong No', 'Not Int') OR ws.status2 IS NULL) AND (ws.status3 IS NULL OR ws.status3 = 'None' OR ws.status3 = ''))
        OR
        (hl.lead_type = 'DIRECT' AND dl.id IS NOT NULL AND (dl.status1 NOT IN ('Wrong No', 'Not Int') OR dl.status1 IS NULL) AND (dl.status2 NOT IN ('Wrong No', 'Not Int') OR dl.status2 IS NULL) AND (dl.status3 IS NULL OR dl.status3 = 'None' OR dl.status3 = ''))
        OR
        (hl.lead_type = 'TRANSFERRED' AND tl.id IS NOT NULL AND (tl.status1 NOT IN ('Wrong No', 'Not Int') OR tl.status1 IS NULL) AND (tl.status2 NOT IN ('Wrong No', 'Not Int') OR tl.status2 IS NULL) AND (tl.status3 NOT IN ('Wrong No', 'Not Int') OR tl.status3 IS NULL) AND (tl.status4 NOT IN ('Wrong No', 'Not Int') OR tl.status4 IS NULL))
        OR
        (hl.lead_type = 'FREE' AND fl.id IS NOT NULL AND (fl.status1 NOT IN ('Wrong No', 'Not Int') OR fl.status1 IS NULL) AND (fl.status2 NOT IN ('Wrong No', 'Not Int') OR fl.status2 IS NULL) AND (fl.status3 NOT IN ('Wrong No', 'Not Int') OR fl.status3 IS NULL) AND (fl.status4 NOT IN ('Wrong No', 'Not Int') OR fl.status4 IS NULL))
      )
      GROUP BY hl.telecaller_id
    `;
    const [hotLeadsRows] = await db.query(hotLeadsQuery);
    const hotLeadsMap = {};
    hotLeadsRows.forEach(r => {
      hotLeadsMap[r.telecaller_id] = r.hot_leads_count;
    });

    const telecallers = rows.map(row => ({
      ...row,
      last_call_gap_label: formatGapLabel(row.last_call_gap_seconds),
      hot_leads_count: hotLeadsMap[row.telecaller_id] || 0
    }));

    res.json({
      success: true,
      telecallers
    });
  } catch (error) {
    console.error('[LastActivity] Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching last activity', error: error.message });
  }
};
