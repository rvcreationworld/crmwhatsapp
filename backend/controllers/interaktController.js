const db = require('../config/db');
const { sendSessionMessage, sendTemplateMessage } = require('../services/interaktService');
const { renderServiceMessage } = require('../services/whatsappServiceMessageService');
const { queueAutomations } = require('../services/automationQueueService');

/**
 * Handles incoming webhooks from Interakt.
 * Phase 6A: Safely stores the payload in whatsapp_inbound_messages and returns HTTP 200.
 */
exports.handleWebhook = async (req, res) => {
    try {
        const payload = req.body;
        console.log(`[Automation Debug] Webhook received. Event Type: ${payload?.type || 'UNKNOWN'}`);

        // Basic payload validation
        if (!payload || Object.keys(payload).length === 0) {
            console.log(`[Automation Debug] Webhook ignored. Reason: Empty payload`);
            return res.status(200).json({ success: true, ignored: true, reason: "Empty payload" });
        }

        // --- Safe Extraction Helpers ---
        const eventType = payload.type || 'UNKNOWN';
        const data = payload.data || {};
        
        // Sometimes the message is nested under data.message, sometimes directly in data
        const message = data.message || payload.message || {};
        const customer = data.customer || message.customer || payload.customer || {};

        const eventId = payload.id || payload.event_id || null;
        const messageId = message.id || null;
        const messageContextId = message.message_context?.id || null;
        const fromPhone = customer.phone_number || customer.phoneNumber || message.from || null;

        if (!fromPhone) {
            console.log("[Interakt Webhook] Ignored event - no sender phone found.");
            console.log(`[Automation Debug] Webhook ignored. Reason: No sender phone`);
            return res.status(200).json({ success: true, ignored: true, reason: "No sender phone" });
        }

        // Normalize phone number to the last 10 digits
        const digitsOnly = String(fromPhone).replace(/[^0-9]/g, '');
        const normalizedNumber = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

        const messageType = message.type || message.message_type || message.message_content_type || 'UNKNOWN';
        
        let messageText = null;
        let buttonText = null;
        let buttonPayload = null;

        // Extract message content based on type
        if (messageType === 'text' || messageType === 'text_message' || message.message) {
            if (message.message && typeof message.message === 'string') {
                messageText = message.message;
            } else if (message.text && typeof message.text === 'object') {
                messageText = message.text.body;
            } else if (message.text) {
                messageText = message.text;
            }
        } 
        
        if (!messageText && (messageType === 'button' || messageType === 'interactive')) {
            const btn = message.button || (message.interactive && message.interactive.button_reply) || {};
            buttonText = btn.text || btn.title || null;
            buttonPayload = btn.payload || btn.id || null;
            messageText = buttonText; // Often, button texts are the primary message content
        }
        
        // Final fallback: if there is a 'message' string, use it
        if (!messageText && message.message && typeof message.message === 'string') {
            messageText = message.message;
        }

        // Attempt to extract timestamp
        let receivedAt = payload.created_at || payload.timestamp || data.created_at || null;
        // If it's a unix timestamp, convert it
        if (receivedAt && typeof receivedAt === 'number' && receivedAt.toString().length <= 13) {
            // UNIX timestamp
            receivedAt = new Date(receivedAt.toString().length === 10 ? receivedAt * 1000 : receivedAt);
        } else if (receivedAt) {
            receivedAt = new Date(receivedAt);
            if (isNaN(receivedAt.getTime())) {
                receivedAt = null; // Invalid date format
            }
        }

        const rawPayload = JSON.stringify(payload);

        // --- Database Insertion ---
        // Duplicate handling: We use INSERT IGNORE. The table should have a unique constraint
        // on event_id or whatsapp_message_id. 
        // If the table doesn't have a unique constraint, we'll manually check.
        
        let existing = [];
        if (eventId) {
            [existing] = await db.query(`SELECT id FROM whatsapp_inbound_messages WHERE event_id = ? LIMIT 1`, [eventId]);
        } else if (messageId) {
            [existing] = await db.query(`SELECT id FROM whatsapp_inbound_messages WHERE whatsapp_message_id = ? LIMIT 1`, [messageId]);
        }

        if (existing.length > 0) {
            console.log(`[Interakt Webhook] Duplicate ignored: ${eventId || messageId}`);
            return res.status(200).json({ success: true, duplicate: true });
        }

        // Determine if we have a valid timestamp to inject, else use NOW()
        const receivedAtValue = receivedAt ? receivedAt : new Date();

        const [insertRes] = await db.query(`
            INSERT INTO whatsapp_inbound_messages (
                provider, event_id, whatsapp_message_id, from_phone, normalized_number, 
                message_text, message_type, event_type, button_text, button_payload, 
                received_at, raw_payload, processed_status, interest_detected, stop_detected
            ) VALUES (
                'INTERAKT', ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, 
                ?, ?, 'PENDING', 0, 0
            )
        `, [
            eventId, messageId, fromPhone, normalizedNumber,
            messageText, messageType, eventType, buttonText, buttonPayload,
            receivedAtValue, rawPayload
        ]);

        const inboundId = insertRes.insertId;
        console.log(`[Interakt Webhook] Stored new inbound event: ${eventType} from ${normalizedNumber}`);

        // Phase 6B: Interested Detection (DIRECT leads only)
        let isInterested = false;
        
        console.log("messageText:", messageText);
        if (messageText) {
            console.log("normalizedText:", messageText.trim().toLowerCase());
        }
        
        if (buttonText && buttonText.trim().toLowerCase() === 'interested') isInterested = true;
        if (buttonPayload && buttonPayload.trim().toLowerCase() === 'interested') isInterested = true;
        if (messageText) {
            const txt = messageText.trim().toLowerCase();
            if (txt === 'interested' || txt === 'yes') isInterested = true;
        }

        console.log("isInterested:", isInterested);
        console.log(`[Automation Debug] Event recognized as Interested click: ${isInterested}`);

        if (isInterested) {
            console.log("[Webhook] Interested detected");
            
            let isBot = false;
            let botQueueRow = null;

            if (messageContextId) {
                const [queueRows] = await db.query(
                    `SELECT lead_type, lead_table, lead_id, lead_name FROM whatsapp_message_queue WHERE whatsapp_message_id = ? LIMIT 1`,
                    [messageContextId]
                );
                if (queueRows.length > 0 && queueRows[0].lead_type === 'BOT' && (queueRows[0].lead_table === 'new_leads' || queueRows[0].lead_table === 'working_sheet')) {
                    isBot = true;
                    botQueueRow = queueRows[0];
                }
            }

            if (isBot) {
                // PART A — BOT Interested webhook
                const botLeadId = botQueueRow.lead_id;
                const botLeadName = botQueueRow.lead_name || 'Customer';
                const botLeadTable = botQueueRow.lead_table;

                const [convos] = await db.query(
                    `SELECT * FROM whatsapp_conversations WHERE lead_table = ? AND lead_id = ? LIMIT 1`,
                    [botLeadTable, botLeadId]
                );

                let shouldUpdate = true;
                if (convos.length > 0 && convos[0].customer_response === 'INTERESTED') {
                    shouldUpdate = false;
                }

                if (shouldUpdate) {
                    await db.query(`
                        INSERT INTO whatsapp_conversations (
                            lead_type, lead_table, lead_id, customer_name, phone_number, normalized_number, customer_response, service_window_opened_at, service_window_expires_at, bot_interest_ack_status, last_inbound_message, last_activity_at, created_at, updated_at
                        ) VALUES (
                            'BOT', ?, ?, ?, ?, ?, 'INTERESTED', ?, DATE_ADD(?, INTERVAL 24 HOUR), 'PENDING', ?, NOW(), NOW(), NOW()
                        ) ON DUPLICATE KEY UPDATE
                            customer_name = VALUES(customer_name),
                            phone_number = VALUES(phone_number),
                            normalized_number = VALUES(normalized_number),
                            customer_response = 'INTERESTED',
                            service_window_opened_at = VALUES(service_window_opened_at),
                            service_window_expires_at = VALUES(service_window_expires_at),
                            bot_interest_ack_status = IF(bot_interest_ack_status = 'SENT', 'SENT', 'PENDING'),
                            last_inbound_message = VALUES(last_inbound_message),
                            last_activity_at = NOW(),
                            updated_at = NOW()
                    `, [botLeadTable, botLeadId, botLeadName, fromPhone, normalizedNumber, receivedAtValue, receivedAtValue, messageText]);

                    await db.query(`
                        UPDATE whatsapp_inbound_messages 
                        SET interest_detected = 1, processed_status = 'PROCESSED' 
                        WHERE id = ?
                    `, [inboundId]);

                    console.log(`[Webhook] BOT customer marked INTERESTED: ${botLeadId}`);

                    // Phase 2: Automation Trigger
                    queueAutomations('INTERESTED_CLICK', 'BOT', botLeadTable, botLeadId, null, fromPhone, normalizedNumber, {
                        customer_name: botLeadName
                    });
                }

                const [updatedConvos] = await db.query(
                    `SELECT bot_interest_ack_status FROM whatsapp_conversations WHERE lead_table = ? AND lead_id = ? LIMIT 1`,
                    [botLeadTable, botLeadId]
                );

                if (updatedConvos.length > 0 && updatedConvos[0].bot_interest_ack_status !== 'SENT') {
                    const ackMessageText = await renderServiceMessage('BOT_INTERESTED_ACK', {
                        website_url: 'https://www.shareshaala.com/'
                    });

                    const sendResult = await sendSessionMessage({
                        phoneNumber: normalizedNumber,
                        messageText: ackMessageText
                    });

                    if (sendResult.success) {
                        await db.query(`
                            UPDATE whatsapp_conversations 
                            SET bot_interest_ack_status = 'SENT',
                                bot_interest_ack_message_id = ?,
                                bot_interest_ack_sent_at = NOW(),
                                last_outbound_message = ?,
                                last_activity_at = NOW()
                            WHERE lead_table = ? AND lead_id = ?
                        `, [sendResult.messageId, ackMessageText, botLeadTable, botLeadId]);
                        console.log(`[Webhook] Sent BOT Interested ACK to lead: ${botLeadId}`);
                    } else {
                        await db.query(`
                            UPDATE whatsapp_conversations 
                            SET bot_interest_ack_status = 'FAILED'
                            WHERE lead_table = ? AND lead_id = ?
                        `, [botLeadTable, botLeadId]);
                        console.log(`[Webhook] Failed to send BOT Interested ACK to lead: ${botLeadId}`);
                    }
                }

                // If lead is already assigned to RM (in working_sheet), send the RM message directly!
                if (botLeadTable === 'working_sheet') {
                    const { sendBotAssignmentMessage } = require('../services/botQueueProcessor');
                    const [wsRows] = await db.query(`SELECT telecaller_id FROM working_sheet WHERE id = ? LIMIT 1`, [botLeadId]);
                    if (wsRows.length > 0 && wsRows[0].telecaller_id) {
                        sendBotAssignmentMessage(botLeadId, wsRows[0].telecaller_id).catch(console.error);
                    }
                }
            } else {
                // Find DIRECT lead by normalized_number
                const [directLeads] = await db.query(
                    `SELECT id, telecaller_id, lead_name FROM direct_leads WHERE contact_last10 = ? ORDER BY id DESC LIMIT 1`, 
                    [normalizedNumber]
                );

            if (directLeads.length > 0) {
                const leadId = directLeads[0].id;
                const telecallerId = directLeads[0].telecaller_id;
                const leadName = directLeads[0].lead_name || 'Customer';
                
                // Prevent duplicate processing
                const [convos] = await db.query(
                    `SELECT * FROM whatsapp_conversations WHERE lead_table = 'direct_leads' AND lead_id = ? LIMIT 1`,
                    [leadId]
                );

                let shouldUpdate = true;
                if (convos.length > 0 && convos[0].customer_response === 'INTERESTED') {
                    shouldUpdate = false;
                }

                if (shouldUpdate) {
                    await db.query(`
                        INSERT INTO whatsapp_conversations (
                            lead_type, lead_table, lead_id, customer_name, phone_number, normalized_number, telecaller_id, customer_response, service_window_opened_at, service_window_expires_at, last_activity_at, created_at, updated_at
                        ) VALUES (
                            'DIRECT', 'direct_leads', ?, ?, ?, ?, ?, 'INTERESTED', ?, DATE_ADD(?, INTERVAL 24 HOUR), NOW(), NOW(), NOW()
                        ) ON DUPLICATE KEY UPDATE
                            customer_name = VALUES(customer_name),
                            phone_number = VALUES(phone_number),
                            normalized_number = VALUES(normalized_number),
                            telecaller_id = VALUES(telecaller_id),
                            customer_response = 'INTERESTED',
                            service_window_opened_at = VALUES(service_window_opened_at),
                            service_window_expires_at = VALUES(service_window_expires_at),
                            last_activity_at = NOW(),
                            updated_at = NOW()
                    `, [leadId, leadName, fromPhone, normalizedNumber, telecallerId, receivedAtValue, receivedAtValue]);
                    console.log(`[Webhook] Conversation updated`);

                    await db.query(`
                        UPDATE whatsapp_inbound_messages 
                        SET interest_detected = 1, processed_status = 'PROCESSED' 
                        WHERE id = ?
                    `, [inboundId]);
                    console.log(`[Webhook] Inbound marked processed`);

                    console.log(`[Webhook] DIRECT customer marked INTERESTED: ${leadId}`);

                    // Phase 2: Automation Trigger
                    queueAutomations('INTERESTED_CLICK', 'DIRECT', 'direct_leads', leadId, telecallerId, fromPhone, normalizedNumber, {
                        customer_name: leadName
                    });
                }

                // Phase 6C: Send RM Details Session Message
                const rmMessageStatus = convos.length > 0 ? convos[0].rm_session_message_status : null;
                const windowExpiresAt = convos.length > 0 ? convos[0].service_window_expires_at : new Date(receivedAtValue.getTime() + 24 * 60 * 60 * 1000);

                if (rmMessageStatus !== 'SENT') {
                    if (new Date(windowExpiresAt) < new Date()) {
                        await db.query(`UPDATE whatsapp_conversations SET rm_session_message_status = 'WINDOW_EXPIRED' WHERE lead_table = 'direct_leads' AND lead_id = ?`, [leadId]);
                    } else if (!telecallerId) {
                        await db.query(`UPDATE whatsapp_conversations SET rm_session_message_status = 'RM_NOT_FOUND' WHERE lead_table = 'direct_leads' AND lead_id = ?`, [leadId]);
                    } else {
                        // Fetch RM details
                        const [rms] = await db.query(`SELECT telecaller_name, tele_mobile, phone_last10 FROM telecaller_master WHERE id = ? LIMIT 1`, [telecallerId]);
                        
                        let rmFound = false;
                        let rmMobile = null;
                        let rmName = null;

                        if (rms.length > 0) {
                            rmName = rms[0].telecaller_name || 'RM';
                            rmMobile = rms[0].tele_mobile;
                            if (!rmMobile || rmMobile.trim() === '') {
                                rmMobile = rms[0].phone_last10;
                            }
                            if (rmMobile && rmMobile.trim() !== '') {
                                rmFound = true;
                            }
                        }

                        if (!rmFound) {
                            await db.query(`UPDATE whatsapp_conversations SET rm_session_message_status = 'RM_NOT_FOUND' WHERE lead_table = 'direct_leads' AND lead_id = ?`, [leadId]);
                        } else {
                            // Send Session Message
                            const messageText = await renderServiceMessage('DIRECT_INTERESTED_RM', {
                                customer_name: leadName,
                                rm_name: rmName,
                                rm_mobile: rmMobile
                            });

                            const sendResult = await sendSessionMessage({
                                phoneNumber: normalizedNumber,
                                messageText: messageText
                            });

                            if (sendResult.success) {
                                await db.query(`
                                    UPDATE whatsapp_conversations 
                                    SET rm_session_message_status = 'SENT',
                                        rm_session_message_id = ?,
                                        rm_session_message_sent_at = NOW(),
                                        last_activity_at = NOW()
                                    WHERE lead_table = 'direct_leads' AND lead_id = ?
                                `, [sendResult.messageId, leadId]);
                                console.log(`[Webhook] Sent RM details to DIRECT lead: ${leadId}`);
                            } else {
                                await db.query(`
                                    UPDATE whatsapp_conversations 
                                    SET rm_session_message_status = 'FAILED'
                                    WHERE lead_table = 'direct_leads' AND lead_id = ?
                                `, [leadId]);
                                console.log(`[Webhook] Failed to send RM details to DIRECT lead: ${leadId}`);
                            }
                        }
                    }
                }
            }
        }
        }

        // Always return 200 OK immediately
        return res.status(200).json({ success: true, received: true });

    } catch (error) {
        // Must never crash the backend
        console.error("[Interakt Webhook] Critical Error processing webhook:", error.message);
        // Even on error, return 200 so Interakt doesn't continuously retry malformed data
        return res.status(200).json({ success: true, error_caught: true });
    }
};
