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
