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

    const telecallers = rows.map(row => ({
      ...row,
      last_call_gap_label: formatGapLabel(row.last_call_gap_seconds)
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
