const db = require('../config/db');

exports.getBroadcasts = async (req, res) => {
    try {
        const [broadcasts] = await db.query(`
            SELECT b.*, u.username as created_by_name 
            FROM whatsapp_recurring_broadcasts b
            LEFT JOIN admin_users u ON b.created_by = u.id
            ORDER BY b.id DESC
        `);

        // Get recipient stats for each
        const [stats] = await db.query(`
            SELECT broadcast_id, status, COUNT(*) as count
            FROM whatsapp_recurring_broadcast_recipients
            GROUP BY broadcast_id, status
        `);

        const statsMap = {};
        for (const stat of stats) {
            if (!statsMap[stat.broadcast_id]) statsMap[stat.broadcast_id] = { queued: 0, failed: 0 };
            if (stat.status === 'QUEUED') statsMap[stat.broadcast_id].queued = stat.count;
            if (stat.status === 'FAILED') statsMap[stat.broadcast_id].failed = stat.count;
        }

        const data = broadcasts.map(b => ({
            ...b,
            stats: statsMap[b.id] || { queued: 0, failed: 0 }
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createBroadcast = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { 
            broadcast_name, schedule_type, daily_time, week_day, month_day,
            message_type, text_message, media_library_id, button_payload_json, list_payload_json,
            is_enabled
        } = req.body;

        if (!broadcast_name || !schedule_type || !daily_time || !message_type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        let media_url = null;
        if (media_library_id) {
            const [media] = await db.query('SELECT public_url FROM whatsapp_media_library WHERE id = ?', [media_library_id]);
            if (media.length > 0) media_url = media[0].public_url;
        }

        const [result] = await db.query(`
            INSERT INTO whatsapp_recurring_broadcasts 
            (broadcast_name, schedule_type, daily_time, week_day, month_day, message_type, text_message, 
             media_library_id, media_url, button_payload_json, list_payload_json, is_enabled, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            broadcast_name, schedule_type, daily_time, week_day || null, month_day || null, message_type, text_message || null,
            media_library_id || null, media_url, 
            button_payload_json ? JSON.stringify(button_payload_json) : null,
            list_payload_json ? JSON.stringify(list_payload_json) : null,
            is_enabled !== undefined ? is_enabled : 1, adminId
        ]);

        res.status(201).json({ success: true, message: 'Broadcast created successfully', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateBroadcast = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            broadcast_name, schedule_type, daily_time, week_day, month_day,
            message_type, text_message, media_library_id, button_payload_json, list_payload_json,
            is_enabled
        } = req.body;

        let media_url = null;
        if (media_library_id) {
            const [media] = await db.query('SELECT public_url FROM whatsapp_media_library WHERE id = ?', [media_library_id]);
            if (media.length > 0) media_url = media[0].public_url;
        }

        await db.query(`
            UPDATE whatsapp_recurring_broadcasts 
            SET broadcast_name = ?, schedule_type = ?, daily_time = ?, week_day = ?, month_day = ?, 
                message_type = ?, text_message = ?, media_library_id = ?, media_url = ?, 
                button_payload_json = ?, list_payload_json = ?, is_enabled = ?
            WHERE id = ?
        `, [
            broadcast_name, schedule_type, daily_time, week_day || null, month_day || null, message_type, text_message || null,
            media_library_id || null, media_url, 
            button_payload_json ? JSON.stringify(button_payload_json) : null,
            list_payload_json ? JSON.stringify(list_payload_json) : null,
            is_enabled !== undefined ? is_enabled : 1, id
        ]);

        res.json({ success: true, message: 'Broadcast updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteBroadcast = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM whatsapp_recurring_broadcasts WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Broadcast deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
