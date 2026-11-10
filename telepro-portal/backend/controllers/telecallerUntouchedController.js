const db = require('../config/db');

exports.getUntouchedLeads = async (req, res) => {
  try {
    const telecallerId = req.user.id || req.user.telecaller_id || req.user.userId;
    
    if (!telecallerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const query = `
      SELECT id, lead_name, lead_contact, contact_last10, status1, source, created_at
      FROM direct_leads
      WHERE telecaller_id = ? AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL) AND (is_closed_lead = 0 OR is_closed_lead IS NULL) AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
        AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
        AND (status_lock_type IS NULL OR status_lock_type != 'KYC_DONE')
        AND (status1 IS NULL OR status1 = '')
        AND NOT EXISTS (
          SELECT 1 
          FROM callpulse_call_logs ccl
          WHERE ccl.telecaller_id = direct_leads.telecaller_id
            AND (
              (ccl.lead_type = 'DIRECT' AND ccl.lead_id = direct_leads.id)
              OR ccl.normalized_number = direct_leads.contact_last10
              OR ccl.normalized_number = RIGHT(direct_leads.lead_contact, 10)
            )
        )
      ORDER BY created_at DESC
    `;

    const [rows] = await db.query(query, [telecallerId]);

    const leads = rows.map(row => ({
      ...row,
      called: false
    }));

    res.json({
      success: true,
      count: leads.length,
      leads: leads
    });
  } catch (error) {
    console.error('[UntouchedLeads] Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching untouched leads', error: error.message });
  }
};
