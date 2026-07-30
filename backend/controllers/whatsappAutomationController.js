const db = require('../config/db');
const { 
    sendSessionMessage, sendImageMessage, sendVideoMessage, sendDocumentMessage, sendAudioMessage, 
    sendInteractiveButtonMessage, sendInteractiveListMessage 
} = require('../services/hubService');

exports.getAutomations = async (req, res) => {
    try {
        const [automations] = await db.query(`
            SELECT a.*, u.username as created_by_name, u2.username as updated_by_name
            FROM whatsapp_automation_messages a
            LEFT JOIN admin_users u ON a.created_by = u.id
            LEFT JOIN admin_users u2 ON a.updated_by = u2.id
            ORDER BY a.display_order ASC, a.delay_days ASC, a.delay_hours ASC, a.delay_minutes ASC, a.id DESC
        `);
        res.json({ success: true, data: automations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const validatePlaceholders = (text) => {
    if (!text) return true;
    const supported = ['customer_name', 'rm_name', 'rm_mobile', 'website_url', 'campaign_name'];
    const matches = typeof text === 'string' ? text.match(/\{\{([^}]+)\}\}/g) : null;
    if (matches) {
        for (const match of matches) {
            const key = match.replace(/[{}]/g, '');
            if (!supported.includes(key)) {
                return `Unsupported placeholder: {{${key}}}`;
            }
        }
    }
    return true;
};

exports.createAutomation = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { 
            automation_name, trigger_type, message_type,
            text_message, media_library_id, button_payload_json, list_payload_json,
            delay_days, delay_hours, delay_minutes, display_order, is_enabled
        } = req.body;

        if (!automation_name || !message_type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const textToValidate = text_message;
        if (textToValidate) {
            if (/<[a-z][\s\S]*>/i.test(textToValidate)) {
                return res.status(400).json({ success: false, message: 'HTML tags are not allowed' });
            }
            const validation = validatePlaceholders(textToValidate);
            if (validation !== true) return res.status(400).json({ success: false, message: validation });
        }

        let media_url = null;
        if (media_library_id) {
            const [media] = await db.query('SELECT public_url FROM whatsapp_media_library WHERE id = ?', [media_library_id]);
            if (media.length > 0) media_url = media[0].public_url;
        }

        const [result] = await db.query(`
            INSERT INTO whatsapp_automation_messages 
            (automation_name, trigger_type, message_type, text_message, media_library_id, media_url, button_payload_json, list_payload_json,
             delay_days, delay_hours, delay_minutes, display_order, is_enabled, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            automation_name, trigger_type || 'INTERESTED_CLICK', message_type, text_message || null, media_library_id || null, media_url, 
            button_payload_json ? JSON.stringify(button_payload_json) : null, 
            list_payload_json ? JSON.stringify(list_payload_json) : null,
            delay_days || 0, delay_hours || 0, delay_minutes || 0, display_order || 1, 
            is_enabled !== undefined ? is_enabled : 1, adminId, adminId
        ]);

        res.status(201).json({ success: true, message: 'Automation created successfully', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { 
            automation_name, trigger_type, message_type,
            text_message, media_library_id, button_payload_json, list_payload_json,
            delay_days, delay_hours, delay_minutes, display_order, is_enabled
        } = req.body;

        const textToValidate = text_message;
        if (textToValidate) {
            if (/<[a-z][\s\S]*>/i.test(textToValidate)) {
                return res.status(400).json({ success: false, message: 'HTML tags are not allowed' });
            }
            const validation = validatePlaceholders(textToValidate);
            if (validation !== true) return res.status(400).json({ success: false, message: validation });
        }

        let media_url = null;
        if (media_library_id) {
            const [media] = await db.query('SELECT public_url FROM whatsapp_media_library WHERE id = ?', [media_library_id]);
            if (media.length > 0) media_url = media[0].public_url;
        }

        await db.query(`
            UPDATE whatsapp_automation_messages 
            SET automation_name = ?, trigger_type = ?, message_type = ?, text_message = ?, media_library_id = ?, media_url = ?, 
                button_payload_json = ?, list_payload_json = ?, delay_days = ?, delay_hours = ?, delay_minutes = ?, 
                display_order = ?, is_enabled = ?, updated_by = ?
            WHERE id = ?
        `, [
            automation_name, trigger_type || 'INTERESTED_CLICK', message_type, text_message || null, media_library_id || null, media_url, 
            button_payload_json ? JSON.stringify(button_payload_json) : null, 
            list_payload_json ? JSON.stringify(list_payload_json) : null,
            delay_days || 0, delay_hours || 0, delay_minutes || 0, display_order || 1, 
            is_enabled !== undefined ? is_enabled : 1, adminId, id
        ]);

        res.json({ success: true, message: 'Automation updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM whatsapp_automation_messages WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Automation deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Replace placeholders like {{customer_name}} with actual values
 */
const renderPlaceholders = (data, variables) => {
    if (!data) return data;
    let isString = false;
    let template = data;
    if (typeof data === 'string') isString = true;
    else template = JSON.stringify(data);
    
    for (const [key, value] of Object.entries(variables || {})) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        template = template.replace(regex, value || '');
    }
    if (isString) return template;
    try { return JSON.parse(template); } catch (e) { return data; }
};

exports.sendTest = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body;
        
        if (!phone_number) return res.status(400).json({ success: false, message: 'Phone number is required' });
        
        const [automations] = await db.query('SELECT * FROM whatsapp_automation_messages WHERE id = ?', [id]);
        if (automations.length === 0) return res.status(404).json({ success: false, message: 'Automation not found' });
        
        const auto = automations[0];
        let mediaUrl = null;
        
        if (auto.media_library_id) {
            const [media] = await db.query('SELECT public_url FROM whatsapp_media_library WHERE id = ?', [auto.media_library_id]);
            if (media.length > 0) mediaUrl = media[0].public_url;
        }

        const testVars = {
            customer_name: 'Test User',
            rm_name: 'Test RM',
            rm_mobile: '9876543210',
            website_url: 'https://test.com',
            campaign_name: 'Test Campaign'
        };

        const messageType = auto.message_type;
        const textMessage = renderPlaceholders(auto.text_message, testVars);
        
        let sendResult;

        if (messageType === 'TEXT') {
            sendResult = await sendSessionMessage({ phoneNumber: phone_number, messageText: textMessage });
        } 
        else if (messageType === 'IMAGE') {
            sendResult = await sendImageMessage({ phoneNumber: phone_number, mediaUrl, messageText: textMessage });
        }
        else if (messageType === 'VIDEO') {
            sendResult = await sendVideoMessage({ phoneNumber: phone_number, mediaUrl, messageText: textMessage });
        }
        else if (messageType === 'DOCUMENT') {
            sendResult = await sendDocumentMessage({ phoneNumber: phone_number, mediaUrl, messageText: textMessage });
        }
        else if (messageType === 'AUDIO') {
            sendResult = await sendAudioMessage({ phoneNumber: phone_number, mediaUrl });
        }
        else if (messageType === 'BUTTON') {
            const payload = renderPlaceholders(auto.button_payload_json, testVars);
            sendResult = await sendInteractiveButtonMessage({ phoneNumber: phone_number, buttonPayload: payload });
        }
        else if (messageType === 'LIST') {
            const payload = renderPlaceholders(auto.list_payload_json, testVars);
            sendResult = await sendInteractiveListMessage({ phoneNumber: phone_number, listPayload: payload });
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported message type: ' + messageType });
        }

        if (sendResult.success) {
            res.json({ success: true, message: 'Test message sent successfully' });
        } else {
            res.status(400).json({ success: false, message: sendResult.error || 'Failed to send test message' });
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
