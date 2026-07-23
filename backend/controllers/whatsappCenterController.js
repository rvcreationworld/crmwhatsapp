const db = require('../config/db');

/**
 * GET /api/whatsapp-center/overview
 * Returns counts for the overview dashboard
 */
exports.getOverview = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. messages_sent_today
        const [messagesSentRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_message_logs 
             WHERE status = 'SENT' AND DATE(sent_at) = ?`,
            [todayStr]
        );

        // 2. direct_welcome_sent
        const [directWelcomeRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_message_logs 
             WHERE lead_type = 'DIRECT' AND template_name = 'thanksform' AND status = 'SENT'`
        );

        // 3. bot_welcome_sent
        const [botWelcomeRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_message_logs 
             WHERE lead_type = 'BOT' AND template_name = 'thanksform' AND status = 'SENT'`
        );

        // 4. interested_replies
        const [interestedRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_inbound_messages 
             WHERE interest_detected = 1`
        );

        // 5. rm_messages_sent
        const [rmSentRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_conversations 
             WHERE rm_session_message_status = 'SENT'`
        );

        // 6. failed_messages
        const [failedRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_message_logs 
             WHERE status = 'FAILED'`
        );

        // 7. pending_queue
        const [pendingRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_message_queue 
             WHERE status IN ('PENDING', 'PROCESSING')`
        );

        // 8. active_24h_windows
        const [activeWindowsRes] = await db.query(
            `SELECT COUNT(*) as count FROM whatsapp_conversations 
             WHERE service_window_expires_at > NOW()`
        );

        res.json({
            success: true,
            data: {
                messages_sent_today: messagesSentRes[0].count,
                direct_welcome_sent: directWelcomeRes[0].count,
                bot_welcome_sent: botWelcomeRes[0].count,
                interested_replies: interestedRes[0].count,
                rm_messages_sent: rmSentRes[0].count,
                failed_messages: failedRes[0].count,
                pending_queue: pendingRes[0].count,
                active_24h_windows: activeWindowsRes[0].count
            }
        });
    } catch (error) {
        console.error("Error in getOverview:", error);
        res.status(500).json({ success: false, message: "Server error fetching overview" });
    }
};

/**
 * GET /api/whatsapp-center/conversations
 */
exports.getConversations = async (req, res) => {
    try {
        const { leadType, customerResponse, rmStatus, search, dateFrom, dateTo } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];
        let countParams = [];

        if (leadType) {
            whereClauses.push("c.lead_type = ?");
            params.push(leadType);
        }
        if (customerResponse) {
            whereClauses.push("c.customer_response = ?");
            params.push(customerResponse);
        }
        if (rmStatus) {
            whereClauses.push("c.rm_session_message_status = ?");
            params.push(rmStatus);
        }
        if (dateFrom && dateTo) {
            whereClauses.push("DATE(c.last_activity_at) BETWEEN ? AND ?");
            params.push(dateFrom, dateTo);
        }
        if (search) {
            whereClauses.push("(c.customer_name LIKE ? OR c.phone_number LIKE ? OR c.normalized_number LIKE ?)");
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        
        // Copy params for count query
        countParams = [...params];
        
        // Pagination params
        params.push(limit, offset);

        const countQuery = `SELECT COUNT(*) as total FROM whatsapp_conversations c ${whereString}`;
        const [countRes] = await db.query(countQuery, countParams);
        const total = countRes[0].total;

        const dataQuery = `
            SELECT 
                c.id, c.customer_name, c.phone_number, c.normalized_number, c.lead_type, c.lead_table, c.lead_id,
                c.telecaller_id, t.telecaller_name as rm_name, c.customer_response, c.initial_template_status,
                c.bot_interest_ack_status, c.rm_session_message_status, c.service_window_opened_at, 
                c.service_window_expires_at, c.last_inbound_message, c.last_outbound_message, c.last_activity_at
            FROM whatsapp_conversations c
            LEFT JOIN telecaller_master t ON c.telecaller_id = t.id
            ${whereString}
            ORDER BY c.last_activity_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(dataQuery, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getConversations:", error);
        res.status(500).json({ success: false, message: "Server error fetching conversations" });
    }
};

/**
 * GET /api/whatsapp-center/logs
 */
exports.getLogs = async (req, res) => {
    try {
        const { leadType, messageType, status, search, dateFrom, dateTo } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];

        if (leadType) {
            whereClauses.push("lead_type = ?");
            params.push(leadType);
        }
        if (messageType) {
            whereClauses.push("message_type = ?");
            params.push(messageType);
        }
        if (status) {
            whereClauses.push("status = ?");
            params.push(status);
        }
        if (dateFrom && dateTo) {
            whereClauses.push("DATE(sent_at) BETWEEN ? AND ?");
            params.push(dateFrom, dateTo);
        }
        if (search) {
            whereClauses.push("phone_number LIKE ?");
            params.push(`%${search}%`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const countParams = [...params];
        
        params.push(limit, offset);

        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM whatsapp_message_logs ${whereString}`, countParams);
        const total = countRes[0].total;

        const dataQuery = `
            SELECT 
                id, queue_id, lead_type, lead_table, lead_id, telecaller_id, phone_number, normalized_number,
                template_name, message_type, status, whatsapp_message_id, error_message, sent_at, created_at
            FROM whatsapp_message_logs
            ${whereString}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(dataQuery, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getLogs:", error);
        res.status(500).json({ success: false, message: "Server error fetching logs" });
    }
};

/**
 * GET /api/whatsapp-center/queue
 */
exports.getQueue = async (req, res) => {
    try {
        const { leadType, status, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];

        if (leadType) {
            whereClauses.push("lead_type = ?");
            params.push(leadType);
        }
        if (status) {
            whereClauses.push("status = ?");
            params.push(status);
        }
        if (search) {
            whereClauses.push("(phone_number LIKE ? OR lead_name LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const countParams = [...params];
        
        params.push(limit, offset);

        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM whatsapp_message_queue ${whereString}`, countParams);
        const total = countRes[0].total;

        const dataQuery = `
            SELECT 
                id, event_key, lead_type, lead_table, lead_id, telecaller_id, lead_name, phone_number,
                trigger_type, template_name, message_type, status, retry_count, next_retry_at, 
                whatsapp_message_id, error_message, created_at, updated_at as sent_at
            FROM whatsapp_message_queue
            ${whereString}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(dataQuery, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getQueue:", error);
        res.status(500).json({ success: false, message: "Server error fetching queue" });
    }
};

/**
 * GET /api/whatsapp-center/inbound
 */
exports.getInbound = async (req, res) => {
    try {
        const { interestedOnly, processedStatus, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];

        if (interestedOnly === 'true') {
            whereClauses.push("interest_detected = 1");
        }
        if (processedStatus) {
            whereClauses.push("processed_status = ?");
            params.push(processedStatus);
        }
        if (search) {
            whereClauses.push("(from_phone LIKE ? OR message_text LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const countParams = [...params];
        
        params.push(limit, offset);

        const [countRes] = await db.query(`SELECT COUNT(*) as total FROM whatsapp_inbound_messages ${whereString}`, countParams);
        const total = countRes[0].total;

        const dataQuery = `
            SELECT 
                id, from_phone, normalized_number, message_text, message_type, event_type, 
                button_text, button_payload, interest_detected, stop_detected, processed_status, 
                received_at, created_at
            FROM whatsapp_inbound_messages
            ${whereString}
            ORDER BY received_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(dataQuery, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getInbound:", error);
        res.status(500).json({ success: false, message: "Server error fetching inbound logs" });
    }
};

/**
 * GET /api/whatsapp-center/settings
 */
exports.getSettings = async (req, res) => {
    try {
        const [settingsRows] = await db.query(`SELECT * FROM whatsapp_settings LIMIT 1`);
        const [templatesRows] = await db.query(`SELECT id, template_name, provider_template_id, language, status, updated_at FROM whatsapp_templates`);

        let settings = {};
        if (settingsRows.length > 0) {
            settings = { ...settingsRows[0] };
            // Remove secrets explicitly
            delete settings.access_token;
            delete settings.verify_token;
            delete settings.api_key;
            delete settings.phone_number_id;
            delete settings.business_account_id;
        }

        res.json({
            success: true,
            data: {
                settings,
                templates: templatesRows
            }
        });

    } catch (error) {
        console.error("Error in getSettings:", error);
        res.status(500).json({ success: false, message: "Server error fetching settings" });
    }
};

/**
 * GET /api/whatsapp-center/service-messages
 */
exports.getServiceMessages = async (req, res) => {
    try {
        const [messages] = await db.query(`
            SELECT m.*, u.username as updated_by_name
            FROM whatsapp_service_messages m
            LEFT JOIN admin_users u ON m.updated_by = u.id
            ORDER BY m.id ASC
        `);
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error fetching service messages:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PUT /api/whatsapp-center/service-messages/:messageKey
 */
exports.updateServiceMessage = async (req, res) => {
    try {
        const { messageKey } = req.params;
        const { message_title, message_body, is_active } = req.body;
        const adminId = req.user.id; // From authMiddleware

        if (!message_body) {
            return res.status(400).json({ success: false, message: 'Message body is required' });
        }

        if (message_body.length > 2000) {
            return res.status(400).json({ success: false, message: 'Message exceeds 2000 characters' });
        }

        if (/<[a-z][\s\S]*>/i.test(message_body)) {
            return res.status(400).json({ success: false, message: 'HTML tags are not allowed' });
        }

        const { SUPPORTED_VARIABLES } = require('../services/whatsappServiceMessageService');
        const matches = message_body.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
            for (const match of matches) {
                const key = match.replace(/[{}]/g, '');
                if (!SUPPORTED_VARIABLES.includes(key)) {
                    return res.status(400).json({ success: false, message: `Unsupported placeholder: {{${key}}}` });
                }
            }
        }

        const [existing] = await db.query(
            'SELECT * FROM whatsapp_service_messages WHERE message_key = ?',
            [messageKey]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Message key not found' });
        }

        await db.query(
            'INSERT INTO whatsapp_service_message_history (message_key, old_message_body, updated_by) VALUES (?, ?, ?)',
            [messageKey, existing[0].message_body, existing[0].updated_by || null]
        );

        await db.query(
            'UPDATE whatsapp_service_messages SET message_title = ?, message_body = ?, is_active = ?, updated_by = ? WHERE message_key = ?',
            [message_title, message_body, is_active ? 1 : 0, adminId, messageKey]
        );

        res.json({ success: true, message: 'Service message updated successfully' });
    } catch (error) {
        console.error('Error updating service message:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
