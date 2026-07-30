const db = require('../config/db');
const interaktController = require('./interaktController');

/**
 * Handles webhooks forwarded from the Communication Hub.
 * The Hub normalizes provider payloads and sends them here.
 */
exports.handleHubWebhook = async (req, res) => {
    try {
        const payload = req.body;
        
        if (!payload || !payload.event) {
            return res.status(200).json({ success: true, ignored: true, reason: 'Missing event format' });
        }
        
        if (payload.event === 'message_received') {
             // Pass the inner raw data back into the old Interakt Controller
             // This way all existing complex logic (Interested detection, Bot assignment) remains untouched!
             console.log("[Hub Webhook] Received INBOUND message. Routing to legacy controller...");
             req.body = payload.data;
             return interaktController.handleWebhook(req, res);
        }
        
        if (payload.event === 'message_status') {
             const { message_id, status } = payload.data;
             
             console.log(`[Hub Webhook] Received STATUS UPDATE for ${message_id} -> ${status}`);
             
             // Update template delivery statuses in conversations
             await db.query(`
                 UPDATE whatsapp_conversations 
                 SET initial_template_status = ? 
                 WHERE initial_template_message_id = ?
             `, [status, message_id]);
             
             // Update bot assignment delivery statuses
             await db.query(`
                 UPDATE whatsapp_conversations 
                 SET rm_session_message_status = ? 
                 WHERE rm_session_message_id = ?
             `, [status, message_id]);
             
             await db.query(`
                 UPDATE whatsapp_conversations 
                 SET bot_interest_ack_status = ? 
                 WHERE bot_interest_ack_message_id = ?
             `, [status, message_id]);
             
             // Update automation / raw queue tables
             await db.query(`
                 UPDATE whatsapp_message_queue 
                 SET status = ? 
                 WHERE whatsapp_message_id = ?
             `, [status, message_id]);
             
             return res.status(200).json({ success: true, message: 'Status updated' });
        }
        
        return res.status(200).json({ success: true, ignored: true, reason: 'Unknown event type' });
    } catch (error) {
        console.error("[Hub Webhook Error]", error.message);
        return res.status(200).json({ success: true, error_caught: true }); // Prevent provider retries
    }
};
