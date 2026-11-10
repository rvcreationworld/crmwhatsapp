const db = require('../config/db');
const { getStatusLockState } = require('../utils/statusLockHelper');

exports.getHotLeads = async (req, res) => {
  const telecallerId = req.user.id;
  try {
    const [hotLogs] = await db.query(
      `SELECT lead_id, lead_type, SUM(duration_seconds) as total_duration, MAX(call_started_at) as last_call_at
       FROM callpulse_call_logs
       WHERE telecaller_id = ?
       GROUP BY lead_id, lead_type
       HAVING SUM(duration_seconds) >= 300
       ORDER BY total_duration DESC`,
      [telecallerId]
    );

    if (hotLogs.length === 0) {
      return res.json({ success: true, leads: [] });
    }

    const botIds = hotLogs.filter(l => l.lead_type === 'BOT').map(l => l.lead_id);
    const directIds = hotLogs.filter(l => l.lead_type === 'DIRECT').map(l => l.lead_id);
    const transIds = hotLogs.filter(l => l.lead_type === 'TRANSFERRED').map(l => l.lead_id);
    const freeIds = hotLogs.filter(l => l.lead_type === 'FREE').map(l => l.lead_id);

    const allLeads = [];

    const mapLogData = (lead, type) => {
      const log = hotLogs.find(l => l.lead_type === type && l.lead_id === lead.id);
      
      let lockType = lead.status_lock_type;
      // Evaluate lock state
      let { isLocked, label, color } = getStatusLockState(lockType);

      return {
        ...lead,
        lead_type: type,
        original_table: type === 'DIRECT' ? 'direct_leads' : (type === 'TRANSFERRED' ? 'transferred_leads' : (type === 'FREE' ? 'free_leads' : 'working_sheet')),
        total_duration: log ? log.total_duration : 0,
        last_call_at: log ? log.last_call_at : null,
        lockState: { isLocked, label, color }
      };
    };

    const excludeCondBotDirect = `(status1 NOT IN ('Wrong No', 'Not Int') OR status1 IS NULL) AND (status2 NOT IN ('Wrong No', 'Not Int') OR status2 IS NULL) AND (status3 IS NULL OR status3 = 'None' OR status3 = '')`;
    const excludeCondTransFree = `(status1 NOT IN ('Wrong No', 'Not Int') OR status1 IS NULL) AND (status2 NOT IN ('Wrong No', 'Not Int') OR status2 IS NULL) AND (status3 NOT IN ('Wrong No', 'Not Int') OR status3 IS NULL) AND (status4 NOT IN ('Wrong No', 'Not Int') OR status4 IS NULL)`;

    if (botIds.length > 0) {
      const [botLeads] = await db.query(
        `SELECT id, lead_name, lead_contact, contact_last10, status1, status1_remark, status1_timestamp, status2, status2_remark, status2_timestamp, status3, status3_remark, status3_timestamp, status_lock_type, is_kyc_done, created_at
         FROM working_sheet WHERE id IN (?) AND telecaller_id = ? AND ${excludeCondBotDirect}`, [botIds, telecallerId]
      );
      botLeads.forEach(l => allLeads.push(mapLogData(l, 'BOT')));
    }

    if (directIds.length > 0) {
      const [directLeads] = await db.query(
        `SELECT id, lead_name, lead_contact, contact_last10, status1, status1_remark, status1_timestamp, status2, status2_remark, status2_timestamp, status3, status3_remark, status3_timestamp, status_lock_type, is_kyc_done, created_at
         FROM direct_leads WHERE id IN (?) AND telecaller_id = ? AND ${excludeCondBotDirect}`, [directIds, telecallerId]
      );
      directLeads.forEach(l => allLeads.push(mapLogData(l, 'DIRECT')));
    }

    if (transIds.length > 0) {
      const [transLeads] = await db.query(
        `SELECT id, lead_name, lead_contact, contact_last10, status4 as status1, status4_remark as status1_remark, status4_timestamp as status1_timestamp, 'None' as status_lock_type, 0 as is_kyc_done, transferred_at as created_at
         FROM transferred_leads WHERE id IN (?) AND current_telecaller_id = ? AND ${excludeCondTransFree}`, [transIds, telecallerId]
      );
      transLeads.forEach(l => allLeads.push(mapLogData(l, 'TRANSFERRED')));
    }

    if (freeIds.length > 0) {
      const [freeLeads] = await db.query(
        `SELECT id, lead_name, lead_contact, contact_last10, status4 as status1, status4_remark as status1_remark, status4_timestamp as status1_timestamp, 'None' as status_lock_type, 0 as is_kyc_done, moved_to_free_at as created_at
         FROM free_leads WHERE id IN (?) AND current_telecaller_id = ? AND ${excludeCondTransFree}`, [freeIds, telecallerId]
      );
      freeLeads.forEach(l => allLeads.push(mapLogData(l, 'FREE')));
    }

    allLeads.sort((a, b) => b.total_duration - a.total_duration);

    res.json({ success: true, leads: allLeads });

  } catch (error) {
    console.error("Error fetching hot leads:", error);
    res.status(500).json({ success: false, message: "Server error fetching hot leads" });
  }
};
