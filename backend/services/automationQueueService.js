const db = require('../config/db');
const {
    sendSessionMessage,
    sendImageMessage,
    sendVideoMessage,
    sendDocumentMessage,
    sendAudioMessage,
    sendInteractiveButtonMessage,
    sendInteractiveListMessage
} = require('./hubService');

/**
 * Queues automations for a specific trigger non-blockingly.
 * @param {string} triggerEvent E.g. 'INTERESTED_CLICK'
 * @param {string} leadType 'DIRECT' or 'BOT'
 * @param {string} leadTable 'direct_leads' or 'new_leads'
 * @param {number} leadId 
 * @param {number|null} telecallerId 
 * @param {string} phoneNumber 
 * @param {string} normalizedNumber 
 * @param {Object} variables Key-value pairs for placeholders
 */
const queueAutomations = async (triggerEvent, leadType, leadTable, leadId, telecallerId, phoneNumber, normalizedNumber, variables) => {
    try {
        console.log(`[Automation Debug] Starting queueAutomations()`);
        // Find matching active automations
        const [automations] = await db.query(`
            SELECT * FROM whatsapp_automation_messages 
            WHERE is_enabled = 1 
            AND trigger_type = ? 
        `, [triggerEvent]);

        console.log(`[Automation Debug] Found ${automations.length} enabled automations.`);
        if (automations.length === 0) {
            console.log(`[Automation Debug] No enabled automations found.`);
            return;
        }

        automations.forEach(auto => {
            console.log(`[Automation Debug] Automation ID: ${auto.id}`);
            console.log(`[Automation Debug] Automation Name: ${auto.automation_name}`);
            console.log(`[Automation Debug] Trigger Type: ${auto.trigger_type}`);
            console.log(`[Automation Debug] Message Type: ${auto.message_type}`);
            console.log(`[Automation Debug] Delay: ${auto.delay_days}d ${auto.delay_hours}h ${auto.delay_minutes}m`);
            console.log(`[Automation Debug] Enabled: ${auto.is_enabled}`);
        });

        // Fetch the conversation's 24-hour service window expiry
        const [convos] = await db.query(`
            SELECT service_window_expires_at 
            FROM whatsapp_conversations 
            WHERE lead_table = ? AND lead_id = ? LIMIT 1
        `, [leadTable, leadId]);

        let windowExpiresAt = null;
        if (convos.length > 0 && convos[0].service_window_expires_at) {
            windowExpiresAt = convos[0].service_window_expires_at;
        }

        const now = new Date();
        const variablesJson = JSON.stringify(variables || {});

        for (const auto of automations) {
            // Calculate scheduled time using days, hours, mins
            let scheduledAt = new Date(now.getTime());
            
            if (auto.delay_days) scheduledAt.setDate(scheduledAt.getDate() + parseInt(auto.delay_days));
            if (auto.delay_hours) scheduledAt.setHours(scheduledAt.getHours() + parseInt(auto.delay_hours));
            if (auto.delay_minutes) scheduledAt.setMinutes(scheduledAt.getMinutes() + parseInt(auto.delay_minutes));

            // Base event key - allows duplicate sends if they are triggered again later
            const uniqueStamp = Date.now() + Math.floor(Math.random() * 10000);
            const eventKey = `AUTOMATION:${auto.id}:${triggerEvent}:${leadType}:${leadTable}:${leadId}:${uniqueStamp}`;
            
            // Note: Since eventKey includes timestamp, it will never conflict. Send once logic can be handled separately if needed.
            
            const [insertRes] = await db.query(`
                INSERT INTO whatsapp_automation_queue (
                    automation_id, event_key, trigger_event, lead_type, lead_table, lead_id, telecaller_id,
                    phone_number, normalized_number, scheduled_at, service_window_expires_at, variables_json,
                    automation_name_snapshot, message_type_snapshot, text_message_snapshot, media_url_snapshot, 
                    media_name_snapshot, button_payload_snapshot, list_payload_snapshot, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            `, [
                auto.id, eventKey, triggerEvent, leadType, leadTable, leadId, telecallerId,
                phoneNumber, normalizedNumber, scheduledAt, windowExpiresAt, variablesJson,
                auto.automation_name, auto.message_type, auto.text_message || auto.caption, 
                auto.media_url, null, 
                auto.button_payload_json ? JSON.stringify(auto.button_payload_json) : null,
                auto.list_payload_json ? JSON.stringify(auto.list_payload_json) : null
            ]);
            
            console.log(`[Automation Debug] Created queue row #${insertRes.insertId}`);
            console.log(`[Automation Debug] Automation ID: ${auto.id}`);
            console.log(`[Automation Debug] Phone Number: ${normalizedNumber}`);
            console.log(`[Automation Debug] Scheduled At: ${scheduledAt}`);
            console.log(`[Automation Debug] Current Time: ${now}`);
            console.log(`[Automation Debug] Queue Row ID: ${insertRes.insertId}`);
            console.log(`[Automation Debug] Status: PENDING`);
        }
    } catch (error) {
        console.error(`[AutomationQueue] Error queuing automations for ${triggerEvent}:`, error.message);
    }
};

/**
 * Replace placeholders like {{customer_name}} with actual values in a JSON structure or string.
 */
const renderPlaceholders = (data, variables) => {
    if (!data) return data;
    
    let isString = false;
    let template = data;
    
    if (typeof data === 'string') {
        isString = true;
    } else {
        template = JSON.stringify(data);
    }
    
    for (const [key, value] of Object.entries(variables || {})) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        template = template.replace(regex, value || '');
    }
    
    if (isString) return template;
    
    try {
        return JSON.parse(template);
    } catch (e) {
        return data;
    }
};

/**
 * Main queue processor for automations.
 * Should be called periodically via cron.
 */
const processAutomationQueue = async () => {
    const isEnabled = process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED === 'true';
    if (!isEnabled) return;

        while (true) {
            let connection;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();

                const nowQueue = new Date();
                const [jobs] = await connection.query(`
                    SELECT q.*, m.display_order 
                    FROM whatsapp_automation_queue q
                    LEFT JOIN whatsapp_automation_messages m ON q.automation_id = m.id
                    WHERE q.status = 'PENDING' AND q.scheduled_at <= NOW() 
                    ORDER BY q.scheduled_at ASC, COALESCE(m.display_order, 999) ASC, q.id ASC
                    LIMIT 1 FOR UPDATE SKIP LOCKED
                `);
                
                if (jobs.length === 0) {
                    await connection.rollback();
                    connection.release();
                    break;
                }

                console.log(`[Automation Debug] Current Time: ${nowQueue}`);
                console.log(`[Automation Debug] Pending Rows Found: ${jobs.length}`);
                console.log(`[Automation Debug] Queue IDs selected: ${jobs.map(j => j.id).join(', ')}`);

                const job = jobs[0];

                // 2. Claim it
                await connection.query(`UPDATE whatsapp_automation_queue SET status = 'PROCESSING' WHERE id = ?`, [job.id]);
                await connection.commit();

                let processResult = 'FAILED';
                let errorMsg = null;
                let messageId = null;

                try {
                    const now = new Date();
                    const expiresAt = job.service_window_expires_at ? new Date(job.service_window_expires_at) : null;

                    // 3. Mandatory 24-hour window check
                    if (!expiresAt || expiresAt <= now) {
                        processResult = 'WINDOW_EXPIRED';
                        errorMsg = 'Service window has expired';
                        console.log(`[Automation Debug] BEFORE SEND - Queue ID: ${job.id}, Phone: ${job.normalized_number}, Message Type: ${job.message_type_snapshot}, Scheduled At: ${job.scheduled_at}, Now: ${now}, Window Open: false`);
                    } 
                    else {
                        console.log(`[Automation Debug] BEFORE SEND - Queue ID: ${job.id}, Phone: ${job.normalized_number}, Message Type: ${job.message_type_snapshot}, Scheduled At: ${job.scheduled_at}, Now: ${now}, Window Open: true`);
                        // Execute sending logic
                        const vars = job.variables_json ? (typeof job.variables_json === 'string' ? JSON.parse(job.variables_json) : job.variables_json) : {};
                        
                        const messageType = job.message_type_snapshot;
                        const textMessage = renderPlaceholders(job.text_message_snapshot, vars);
                        const mediaUrl = job.media_url_snapshot;
                        
                        let sendResult;

                        if (messageType === 'TEXT') {
                            sendResult = await sendSessionMessage({ phoneNumber: job.normalized_number, messageText: textMessage });
                        } 
                        else if (messageType === 'IMAGE') {
                            sendResult = await sendImageMessage({ phoneNumber: job.normalized_number, mediaUrl, messageText: textMessage });
                        }
                        else if (messageType === 'VIDEO') {
                            sendResult = await sendVideoMessage({ phoneNumber: job.normalized_number, mediaUrl, messageText: textMessage });
                        }
                        else if (messageType === 'DOCUMENT') {
                            sendResult = await sendDocumentMessage({ phoneNumber: job.normalized_number, mediaUrl, messageText: textMessage });
                        }
                        else if (messageType === 'AUDIO') {
                            sendResult = await sendAudioMessage({ phoneNumber: job.normalized_number, mediaUrl });
                        }
                        else if (messageType === 'BUTTON') {
                            const payload = renderPlaceholders(job.button_payload_snapshot, vars);
                            sendResult = await sendInteractiveButtonMessage({ phoneNumber: job.normalized_number, buttonPayload: payload });
                        }
                        else if (messageType === 'LIST') {
                            const payload = renderPlaceholders(job.list_payload_snapshot, vars);
                            sendResult = await sendInteractiveListMessage({ phoneNumber: job.normalized_number, listPayload: payload });
                        } else {
                            sendResult = { success: false, error: 'Unsupported message type: ' + messageType };
                        }

                        if (sendResult.success) {
                            console.log(`[Automation Debug] Interakt API Success`);
                            console.log(`[Automation Debug] Queue ID: ${job.id}`);
                            console.log(`[Automation Debug] Response: ${JSON.stringify(sendResult)}`);
                            console.log(`[Automation Debug] Queue marked SENT`);

                            processResult = 'SENT';
                            messageId = sendResult.messageId;

                            // Log to whatsapp_message_logs
                            await connection.query(`
                                INSERT INTO whatsapp_message_logs (
                                    lead_table, lead_id, phone_number, normalized_number, message_type,
                                    message_text, whatsapp_message_id, status, sent_at
                                ) VALUES (?, ?, ?, ?, 'SESSION', ?, ?, 'SENT', NOW())
                            `, [
                                job.lead_table, job.lead_id, job.phone_number, job.normalized_number,
                                textMessage || messageType, messageId
                            ]);
                        } else {
                            console.log(`[Automation Debug] Queue ID: ${job.id}`);
                            console.log(`[Automation Debug] Error: Failed to send via Interakt`);
                            console.log(`[Automation Debug] Stack Trace: N/A`);
                            console.log(`[Automation Debug] Interakt Response: ${JSON.stringify(sendResult)}`);
                            console.log(`[Automation Debug] Queue Status: FAILED`);
                            
                            processResult = 'FAILED';
                            errorMsg = sendResult.error || 'Failed to send via Interakt';
                        }
                    }
                } catch (jobError) {
                    console.log(`[Automation Debug] Queue ID: ${job.id}`);
                    console.log(`[Automation Debug] Error: ${jobError.message}`);
                    console.log(`[Automation Debug] Stack Trace: ${jobError.stack}`);
                    console.log(`[Automation Debug] Queue Status: FAILED`);
                    
                    console.error(`[AutomationQueue] Error processing job ${job.id}:`, jobError.message);
                    errorMsg = jobError.message;
                    processResult = 'FAILED';
                }

                // 5. Update final status
                let updateQuery = `UPDATE whatsapp_automation_queue SET status = ?, updated_at = NOW()`;
                let updateParams = [processResult];

                if (processResult === 'SENT') {
                    updateQuery += `, whatsapp_message_id = ?, sent_at = NOW()`;
                    updateParams.push(messageId);
                } else if (processResult === 'FAILED') {
                    updateQuery += `, error_message = ?, retry_count = retry_count + 1`;
                    updateParams.push(errorMsg);
                } else {
                    updateQuery += `, error_message = ?`;
                    updateParams.push(errorMsg);
                }

                updateQuery += ` WHERE id = ?`;
                updateParams.push(job.id);

                await connection.query(updateQuery, updateParams);
                connection.release();

            } catch (err) {
                if (connection) {
                    await connection.rollback();
                    connection.release();
                }
                console.error(`[AutomationQueue] Processor fatal error:`, err.message);
                break;
            }
        }
};

module.exports = {
    queueAutomations,
    processAutomationQueue
};
