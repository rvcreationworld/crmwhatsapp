const db = require('../config/db');
const { checkEligibility } = require('./botQueueProcessor');

const refreshTop10Cache = async () => {
    try {
        console.log("[BotTop10] Refreshing Top 10 Telecallers cache...");
        
        // 0. Get configured limit
        const [settingsRows] = await db.query(`SELECT setting_value FROM app_settings WHERE setting_key = 'bot_auto_assignment_top_count' LIMIT 1`);
        let topCount = 10;
        if (settingsRows.length > 0 && settingsRows[0].setting_value) {
             const parsed = parseInt(settingsRows[0].setting_value, 10);
             if (!isNaN(parsed) && parsed >= 1 && parsed <= 500) {
                 topCount = parsed;
             }
        }

        // 1. Calculate Top N
        const query = `
            SELECT 
                t.id AS telecaller_id,
                t.telecaller_name,
                COALESCE(SUM(c.duration_seconds), 0) AS total_call_time,
                COUNT(c.id) AS connected_calls
            FROM telecaller_master t
            LEFT JOIN callpulse_call_logs c ON t.id = c.telecaller_id
                AND c.call_started_at >= NOW() - INTERVAL 7 DAY
                AND c.call_started_at <= NOW()
                AND c.duration_seconds > 0
            WHERE t.is_active = 1 
              AND t.is_deleted = 0
              AND (t.bot_leads_paused = 0 OR t.bot_leads_paused IS NULL)
            GROUP BY t.id
            ORDER BY total_call_time DESC, connected_calls DESC, t.id ASC
            LIMIT ?
        `;
        
        const [top10] = await db.query(query, [topCount]);
        
        if (top10.length === 0) {
            console.log("[BotTop10] No eligible telecallers found.");
            await db.query(`TRUNCATE TABLE bot_top10_telecaller_cache`);
            return top10;
        }

        // 2. No eligibility checks needed for Auto Assignment.
        const candidates = [];
        for (let i = 0; i < top10.length; i++) {
            const tc = top10[i];
            
            candidates.push({
                telecaller_id: tc.telecaller_id,
                rank_position: i + 1,
                total_call_time_seconds: tc.total_call_time || 0,
                connected_calls: tc.connected_calls || 0,
                is_blocked: 0 // Auto Assign no longer blocks on Status 1
            });
        }
        
        // 3. Rebuild cache table atomically
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(`TRUNCATE TABLE bot_top10_telecaller_cache`);
            
            for (const cand of candidates) {
                await connection.query(`
                    INSERT INTO bot_top10_telecaller_cache 
                    (telecaller_id, rank_position, total_call_time_seconds, connected_calls, is_blocked, calculated_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [cand.telecaller_id, cand.rank_position, cand.total_call_time_seconds, cand.connected_calls, cand.is_blocked]);
            }
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

        console.log("[BotTop10] Cache refreshed successfully.");
        return candidates;
    } catch (error) {
        console.error("[BotTop10] Error refreshing cache:", error);
        return [];
    }
};

const getTop10FromCache = async () => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, t.telecaller_name 
            FROM bot_top10_telecaller_cache c
            JOIN telecaller_master t ON c.telecaller_id = t.id
            WHERE (t.bot_leads_paused = 0 OR t.bot_leads_paused IS NULL)
            ORDER BY c.rank_position ASC
        `);
        return rows;
    } catch (error) {
        console.error("[BotTop10] Error fetching top 10 from cache:", error);
        return [];
    }
};

const getEligibleTop10FromCache = async () => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, t.telecaller_name 
            FROM bot_top10_telecaller_cache c
            JOIN telecaller_master t ON c.telecaller_id = t.id
            WHERE c.is_blocked = 0 AND (t.bot_leads_paused = 0 OR t.bot_leads_paused IS NULL)
            ORDER BY c.rank_position ASC
        `);
        return rows;
    } catch (error) {
        console.error("[BotTop10] Error fetching eligible top 10 from cache:", error);
        return [];
    }
};

// Start background refresh
const startRefreshCron = () => {
    const isEnabled = process.env.BOT_TOP10_REFRESH_ENABLED !== 'false';
    if (!isEnabled) return;
    
    const intervalSeconds = parseInt(process.env.BOT_TOP10_REFRESH_INTERVAL_SECONDS || 300, 10);
    
    console.log(`[BotTop10] Starting background refresh cron every ${intervalSeconds} seconds.`);
    
    // Initial run
    setTimeout(() => {
        refreshTop10Cache();
    }, 5000);
    
    setInterval(() => {
        refreshTop10Cache();
    }, intervalSeconds * 1000);
};

module.exports = {
    refreshTop10Cache,
    getTop10FromCache,
    getEligibleTop10FromCache,
    startRefreshCron
};
