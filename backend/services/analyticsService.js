const db = require('../config/db');

// Date Helper: Converts JS Date/preset string to SQL date boundaries in UTC (assuming server DB stores UTC)
function getAnalyticsDateRange(preset, customStart, customEnd) {
    let startDate = new Date();
    let endDate = new Date();
    
    const getISTDate = (date = new Date()) => {
        const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return istTime;
    };

    const istNow = getISTDate();
    let istStart = new Date(istNow);
    istStart.setUTCHours(0,0,0,0);
    
    let istEnd = new Date(istStart);
    istEnd.setUTCDate(istEnd.getUTCDate() + 1);

    if (preset === 'today') {
        // Keep istStart and istEnd
    } else if (preset === 'yesterday') {
        istStart.setUTCDate(istStart.getUTCDate() - 1);
        istEnd.setUTCDate(istEnd.getUTCDate() - 1);
    } else if (preset === 'week') {
        const day = istStart.getUTCDay();
        const diff = istStart.getUTCDate() - day + (day === 0 ? -6 : 1);
        istStart.setUTCDate(diff);
    } else if (preset === 'month') {
        istStart.setUTCDate(1);
    } else if (preset === 'custom' && customStart && customEnd) {
        istStart = new Date(customStart + "T00:00:00Z");
        istEnd = new Date(customEnd + "T00:00:00Z");
        istEnd.setUTCDate(istEnd.getUTCDate() + 1);
    }

    // Convert back to UTC bounds for DB querying
    startDate = new Date(istStart.getTime() - (5.5 * 60 * 60 * 1000));
    endDate = new Date(istEnd.getTime() - (5.5 * 60 * 60 * 1000));

    return { 
        startStr: startDate.toISOString().slice(0, 19).replace('T', ' '), 
        endStr: endDate.toISOString().slice(0, 19).replace('T', ' ') 
    };
}

class AnalyticsService {
    async getOverview(preset, startDate, endDate, telecallerId) {
        const { startStr, endStr } = getAnalyticsDateRange(preset, startDate, endDate);
        
        let telecallerFilter = '';
        let queryParams = [startStr, endStr];
        let queryParamsCount = [startStr, endStr];
        if (telecallerId && telecallerId !== 'all') {
            telecallerFilter = ' AND telecaller_id = ?';
            queryParams.push(telecallerId);
            queryParamsCount.push(telecallerId);
        }

        const [[{ active_telecallers }]] = await db.query(
            `SELECT COUNT(*) as active_telecallers FROM telecaller_master WHERE is_active = 1 AND is_deleted = 0`
        );

        const callMetricsQuery = `
            SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN call_type = 'OUTGOING' THEN 1 ELSE 0 END) as total_dials,
                COUNT(DISTINCT CASE WHEN call_type = 'OUTGOING' THEN normalized_number END) as unique_dials,
                SUM(CASE WHEN duration_seconds > 0 AND call_type IN ('OUTGOING', 'INCOMING') THEN 1 ELSE 0 END) as connected_calls,
                COUNT(DISTINCT CASE WHEN duration_seconds > 0 AND call_type IN ('OUTGOING', 'INCOMING') THEN normalized_number END) as unique_connected,
                SUM(CASE WHEN duration_seconds > 0 AND call_type IN ('OUTGOING', 'INCOMING') THEN duration_seconds ELSE 0 END) as total_talk_time,
                SUM(CASE WHEN call_type IN ('MISSED', 'REJECTED') THEN 1 ELSE 0 END) as missed_rejected
            FROM callpulse_call_logs
            WHERE call_started_at >= ? AND call_started_at < ? ${telecallerFilter}
        `;
        const [[callStats]] = await db.query(callMetricsQuery, queryParams);

        const dlQuery = `SELECT COUNT(*) as dl_rcv FROM direct_leads WHERE created_at >= ? AND created_at < ? ${telecallerFilter}`;
        const [[{ dl_rcv }]] = await db.query(dlQuery, queryParamsCount);

        const poolQuery = `SELECT COUNT(*) as pool_fetched FROM bot_lead_fetch_queue WHERE fetched_at >= ? AND fetched_at < ? ${telecallerFilter}`;
        const [[{ pool_fetched }]] = await db.query(poolQuery, queryParamsCount);

        const kycParams = telecallerId && telecallerId !== 'all' ? [startStr, endStr, telecallerId, telecallerId, telecallerId] : [startStr, endStr];
        const kycFilter = telecallerId && telecallerId !== 'all' ? ' AND (telecaller_id = ? OR current_telecaller_id = ? OR previous_telecaller_name = (SELECT telecaller_name FROM telecaller_master WHERE id = ?))' : '';
        const [[{ kyc_count }]] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM working_sheet WHERE is_kyc_done = 1 AND kyc_done_at >= ? AND kyc_done_at < ? ${kycFilter.replace(/current_telecaller_id/g, 'telecaller_id').replace(/previous_telecaller_name.*/g, 'telecaller_id = 0)')}) +
                (SELECT COUNT(*) FROM direct_leads WHERE is_kyc_done = 1 AND kyc_done_at >= ? AND kyc_done_at < ? ${kycFilter.replace(/current_telecaller_id/g, 'telecaller_id').replace(/previous_telecaller_name.*/g, 'telecaller_id = 0)')}) as total
        `, [startStr, endStr, startStr, endStr].concat(kycParams).concat(kycParams));

        return {
            activeTelecallers: active_telecallers,
            totalCalls: callStats.total_calls || 0,
            totalDials: callStats.total_dials || 0,
            uniqueDials: callStats.unique_dials || 0,
            connectedCalls: callStats.connected_calls || 0,
            uniqueConnected: callStats.unique_connected || 0,
            totalTalkTime: callStats.total_talk_time || 0,
            avgTalkTime: callStats.connected_calls > 0 ? Math.round((callStats.total_talk_time || 0) / callStats.connected_calls) : 0,
            missedRejected: callStats.missed_rejected || 0,
            directLeadsReceived: dl_rcv || 0,
            poolLeadsFetched: pool_fetched || 0,
            kycDone: kyc_count || 0
        };
    }

    async getLeaderboard(preset, startDate, endDate) {
        const { startStr, endStr } = getAnalyticsDateRange(preset, startDate, endDate);
        
        const [telecallers] = await db.query(`SELECT id, telecaller_name FROM telecaller_master WHERE is_active = 1 AND is_deleted = 0`);

        const [callStats] = await db.query(`
            SELECT 
                telecaller_id,
                SUM(CASE WHEN call_type = 'OUTGOING' THEN 1 ELSE 0 END) as total_dials,
                COUNT(DISTINCT CASE WHEN call_type = 'OUTGOING' THEN normalized_number END) as unique_dials,
                SUM(CASE WHEN duration_seconds > 0 AND call_type IN ('OUTGOING', 'INCOMING') THEN 1 ELSE 0 END) as connected_calls,
                SUM(CASE WHEN duration_seconds > 0 AND call_type IN ('OUTGOING', 'INCOMING') THEN duration_seconds ELSE 0 END) as talk_time_seconds,
                MAX(call_started_at) as last_dial
            FROM callpulse_call_logs
            WHERE call_started_at >= ? AND call_started_at < ?
            GROUP BY telecaller_id
        `, [startStr, endStr]);

        const [statusStats] = await db.query(`
            SELECT telecaller_id, COUNT(*) as status_updates
            FROM working_sheet
            WHERE status3_timestamp >= ? AND status3_timestamp < ?
            GROUP BY telecaller_id
            UNION ALL
            SELECT telecaller_id, COUNT(*) as status_updates
            FROM direct_leads
            WHERE status3_timestamp >= ? AND status3_timestamp < ?
            GROUP BY telecaller_id
        `, [startStr, endStr, startStr, endStr]);

        const [syncStats] = await db.query(`SELECT telecaller_id, last_sync_at FROM callpulse_agents`);

        const leaderboard = telecallers.map(t => {
            const calls = callStats.find(c => c.telecaller_id === t.id) || {};
            const statuses = statusStats.filter(s => s.telecaller_id === t.id).reduce((sum, curr) => sum + curr.status_updates, 0);
            const sync = syncStats.find(s => s.telecaller_id === t.id) || {};
            
            const unique_dials = calls.unique_dials || 0;
            const talk_time_seconds = calls.talk_time_seconds || 0;
            const connected_calls = calls.connected_calls || 0;
            
            let udScore = Math.min(unique_dials / 60, 1) * 25;
            let ttScore = Math.min(talk_time_seconds / 5400, 1) * 25;
            let cnScore = Math.min(connected_calls / 25, 1) * 20;
            let stScore = Math.min(statuses / 20, 1) * 15;
            let lhScore = 15; 
            
            let totalScore = Math.max(0, Math.min(100, Math.round(udScore + ttScore + cnScore + stScore + lhScore)));

            return {
                id: t.id,
                telecaller_name: t.telecaller_name,
                total_dials: calls.total_dials || 0,
                unique_dials,
                connected_calls,
                talk_time: talk_time_seconds,
                status_updates: statuses,
                last_dial: calls.last_dial || null,
                last_sync: sync.last_sync_at || null,
                score: totalScore
            };
        });

        leaderboard.sort((a, b) => b.score - a.score);
        return leaderboard;
    }

    async getActionCenter() {
        const { startStr, endStr } = getAnalyticsDateRange('today');
        const alerts = [];
        
        const [telecallers] = await db.query(`SELECT id, telecaller_name FROM telecaller_master WHERE is_active = 1 AND is_deleted = 0`);
        const [callStats] = await db.query(`
            SELECT 
                telecaller_id,
                COUNT(DISTINCT CASE WHEN call_type = 'OUTGOING' THEN normalized_number END) as unique_dials,
                MAX(CASE WHEN call_type = 'OUTGOING' THEN call_started_at END) as last_dial
            FROM callpulse_call_logs
            WHERE call_started_at >= ? AND call_started_at < ?
            GROUP BY telecaller_id
        `, [startStr, endStr]);
        
        const [syncStats] = await db.query(`SELECT telecaller_id, last_sync_at FROM callpulse_agents`);
        const now = new Date();

        for (const t of telecallers) {
            const calls = callStats.find(c => c.telecaller_id === t.id) || { unique_dials: 0, last_dial: null };
            const sync = syncStats.find(s => s.telecaller_id === t.id) || { last_sync_at: null };

            if (calls.last_dial) {
                const diffMins = (now - new Date(calls.last_dial)) / (1000 * 60);
                if (diffMins > 60) {
                    alerts.push({ id: `nocall_${t.id}`, severity: 'CRITICAL', telecaller_name: t.telecaller_name, message: `${t.telecaller_name} has not dialed for ${Math.floor(diffMins/60)}h ${Math.floor(diffMins%60)}m`, action: 'View Calls', telecaller_id: t.id });
                }
            } else {
                alerts.push({ id: `nocall_${t.id}`, severity: 'CRITICAL', telecaller_name: t.telecaller_name, message: `${t.telecaller_name} has made 0 outgoing calls today.`, action: 'Call Telecaller', telecaller_id: t.id });
            }

            if (calls.unique_dials < 20 && now.getHours() >= 14) {
                alerts.push({ id: `lowcall_${t.id}`, severity: 'WARNING', telecaller_name: t.telecaller_name, message: `${t.telecaller_name} has only ${calls.unique_dials} unique dials today.`, action: 'View Leaderboard', telecaller_id: t.id });
            }

            if (sync.last_sync_at) {
                const diffMins = (now - new Date(sync.last_sync_at)) / (1000 * 60);
                if (diffMins > 30) {
                    alerts.push({ id: `sync_${t.id}`, severity: 'WARNING', telecaller_name: t.telecaller_name, message: `${t.telecaller_name} CallPulse not synced for ${Math.floor(diffMins)}m`, action: 'CallPulse Details', telecaller_id: t.id });
                }
            } else {
                alerts.push({ id: `sync_${t.id}`, severity: 'INFO', telecaller_name: t.telecaller_name, message: `${t.telecaller_name} has never synced CallPulse.`, action: 'CallPulse Details', telecaller_id: t.id });
            }
        }

        alerts.sort((a, b) => {
            const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
            return sevOrder[a.severity] - sevOrder[b.severity];
        });

        return alerts;
    }

    async getHourlyPattern(preset, startDate, endDate, telecallerId) {
        const { startStr, endStr } = getAnalyticsDateRange(preset, startDate, endDate);
        let telecallerFilter = '';
        let params = [startStr, endStr];
        if (telecallerId && telecallerId !== 'all') {
            telecallerFilter = ' AND telecaller_id = ?';
            params.push(telecallerId);
        }

        const [rows] = await db.query(`
            SELECT 
                HOUR(CONVERT_TZ(call_started_at, '+00:00', '+05:30')) as hour,
                COUNT(*) as dials,
                SUM(CASE WHEN duration_seconds > 0 THEN 1 ELSE 0 END) as connected,
                SUM(duration_seconds) as talk_time
            FROM callpulse_call_logs
            WHERE call_started_at >= ? AND call_started_at < ? ${telecallerFilter}
            GROUP BY hour
            ORDER BY hour
        `, params);

        return rows;
    }
}

module.exports = new AnalyticsService();
