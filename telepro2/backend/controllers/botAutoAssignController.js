const db = require('../config/db');
const { getTop10FromCache, refreshTop10Cache } = require('../services/botTop10Service');
const { processBotLeadQueue } = require('../services/botQueueProcessor');

exports.getTopTelecallers = async (req, res) => {
    try {
        const top10 = await getTop10FromCache();
        let calculated_at = null;
        if (top10.length > 0) {
            calculated_at = top10[0].calculated_at;
        }

        // Add bot_leads_assigned_today dynamically
        const [assignmentStats] = await db.query(`
            SELECT telecaller_id, COUNT(*) as bot_leads_assigned_today
            FROM bot_lead_assignment_history
            WHERE assignment_mode = 'AUTO_TOP10' 
              AND DATE(assigned_at) = CURDATE()
            GROUP BY telecaller_id
        `);
        const statsMap = {};
        assignmentStats.forEach(s => {
            statsMap[s.telecaller_id] = s.bot_leads_assigned_today;
        });

        const formattedTop10 = top10.map(tc => ({
            rank: tc.rank_position,
            telecaller_id: tc.telecaller_id,
            telecaller_name: tc.telecaller_name,
            total_call_time_seconds: tc.total_call_time_seconds,
            connected_calls: tc.connected_calls,
            is_blocked: tc.is_blocked === 1,
            bot_leads_assigned_today: statsMap[tc.telecaller_id] || 0
        }));

        res.json({
            success: true,
            calculated_at,
            top10: formattedTop10
        });

        // Trigger an async background refresh if cache is empty
        if (top10.length === 0) {
            refreshTop10Cache();
        }

    } catch (error) {
        console.error("Error in getTopTelecallers:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const [stateRows] = await db.query(`SELECT * FROM bot_auto_assign_state WHERE id = 1`);
        const state = stateRows[0];

        const [poolRes] = await db.query(`SELECT COUNT(*) as count FROM new_leads`);
        const [queueRes] = await db.query(`SELECT COUNT(*) as count FROM bot_lead_fetch_queue WHERE status = 'WAITING'`);
        
        const [assignedRes] = await db.query(`
            SELECT COUNT(*) as count 
            FROM bot_lead_assignment_history 
            WHERE assignment_mode = 'AUTO_TOP10' AND DATE(assigned_at) = CURDATE()
        `);

        let lastTelecallerName = null;
        if (state.last_telecaller_id) {
            const [tcRes] = await db.query(`SELECT telecaller_name FROM telecaller_master WHERE id = ?`, [state.last_telecaller_id]);
            if (tcRes.length > 0) lastTelecallerName = tcRes[0].telecaller_name;
        }

        // Determine next likely telecaller from eligible pool
        const [top10] = await db.query(`
            SELECT c.*, t.telecaller_name 
            FROM bot_top10_telecaller_cache c
            JOIN telecaller_master t ON c.telecaller_id = t.id
            WHERE c.is_blocked = 0
            ORDER BY c.rank_position ASC
        `);

        let nextTelecaller = null;
        let calculatedAt = null;

        if (top10.length > 0) {
            calculatedAt = top10[0].calculated_at;
            let lastIndex = top10.findIndex(tc => tc.telecaller_id === state.last_telecaller_id);
            if (lastIndex === -1 || lastIndex === top10.length - 1) {
                nextTelecaller = { telecaller_id: top10[0].telecaller_id, telecaller_name: top10[0].telecaller_name };
            } else {
                nextTelecaller = { telecaller_id: top10[lastIndex + 1].telecaller_id, telecaller_name: top10[lastIndex + 1].telecaller_name };
            }
        }

        res.json({
            success: true,
            is_enabled: state.is_enabled === 1,
            pool_count: poolRes[0].count,
            manual_queue_count: queueRes[0].count,
            last_telecaller_id: state.last_telecaller_id,
            last_telecaller_name: lastTelecallerName,
            next_telecaller: nextTelecaller,
            auto_assigned_today: assignedRes[0].count,
            calculated_at: calculatedAt
        });

    } catch (error) {
        console.error("Error in getStatus:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { is_enabled } = req.body;
        const updated_by = req.user ? req.user.id : null;

        await db.query(`
            UPDATE bot_auto_assign_state 
            SET is_enabled = ?, updated_by = ? 
            WHERE id = 1
        `, [is_enabled ? 1 : 0, updated_by]);

        res.json({ success: true, is_enabled: !!is_enabled });

        if (is_enabled) {
            // Refresh cache when enabling and trigger drain
            refreshTop10Cache().then(() => {
                processBotLeadQueue();
            });
        }
    } catch (error) {
        console.error("Error in updateStatus:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
