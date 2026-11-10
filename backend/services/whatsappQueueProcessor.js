const db = require('../config/db');
const { sendTemplateMessage } = require('./hubService');
const { queueAutomations } = require('./automationQueueService');
const { getAssignedTemplate } = require('./whatsappTemplateService');
const { renderTemplateVariables } = require('./templateResolverService');

let isPolling = false;
let pollingInterval = null;

/**
 * Parses template_params (JSON) into an array of values for Interakt's bodyValues.
 * E.g. {"name": "Raj", "amount": "500"} -> ["Raj", "500"]
 * 
 * @param {string|object} params 
 * @returns {Array} Array of string values
 */
const extractBodyValues = (params) => {
    if (!params) return [];
    
    try {
        const parsed = typeof params === 'string' ? JSON.parse(params) : params;
        return Object.values(parsed).map(val => String(val));
    } catch (e) {
        console.error("[WhatsApp Queue] Error parsing template_params:", e.message);
        return [];
    }
};

/**
 * Fetches WhatsApp queue settings dynamically.
 */
const getWhatsAppSettings = async () => {
    let maxRetries = 3;
    let retryMinutes = 15;
    
    try {
        const [settingsRows] = await db.query("SELECT * FROM whatsapp_settings");
        if (settingsRows.length > 0) {
            const s = settingsRows[0];
            
            // Handle if schema is key/value
            if (s.setting_key && s.setting_value) {
                settingsRows.forEach(row => {
                    if (row.setting_key === 'max_retry_count') maxRetries = parseInt(row.setting_value, 10) || maxRetries;
                    if (row.setting_key === 'retry_after_minutes') retryMinutes = parseInt(row.setting_value, 10) || retryMinutes;
                });
            } else {
                // Handle if schema is wide columns
                if (s.max_retry_count !== undefined) maxRetries = parseInt(s.max_retry_count, 10) || maxRetries;
                if (s.retry_after_minutes !== undefined) retryMinutes = parseInt(s.retry_after_minutes, 10) || retryMinutes;
            }
        }
    } catch (err) {
        console.error("[WhatsApp Queue] Could not read whatsapp_settings, using defaults. Error:", err.message);
    }
    
    return { maxRetries, retryMinutes };
};

/**
 * Processes a single pending job from the whatsapp_message_queue.
 */
const processNextJob = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        // 1. Read one pending queue row (handling retries safely)
        const [rows] = await db.query(`
            SELECT * FROM whatsapp_message_queue 
            WHERE status = 'PENDING' 
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
            ORDER BY created_at ASC 
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) {
            isPolling = false;
            return; // No jobs to process
        }

        const job = rows[0];
        console.log(`[WhatsApp Queue] Queue picked - Lead ID: ${job.lead_id}, Phone: ${job.phone_number}, Template: ${job.template_name}`);

        // 2. Immediately update it to PROCESSING
        await db.query(`UPDATE whatsapp_message_queue SET status = 'PROCESSING', updated_at = NOW() WHERE id = ?`, [job.id]);

        // Extract required params
        const bodyValues = extractBodyValues(job.template_params);
        let headerValues = null;
        if (job.template_header_values) {
            headerValues = typeof job.template_header_values === 'string' ? JSON.parse(job.template_header_values) : job.template_header_values;
        }
        
        const requestPayload = {
            phoneNumber: job.phone_number,
            templateName: job.template_name,
            bodyValues: bodyValues,
            headerValues: headerValues,
            languageCode: job.template_language,
            callbackData: JSON.stringify({ queueId: job.id, leadId: job.lead_id })
        };

        // 3. Call sendTemplateMessage
        const result = await sendTemplateMessage(requestPayload);

        // Fetch settings for retry logic
        const { maxRetries, retryMinutes } = await getWhatsAppSettings();

        if (result.success) {
            console.log(`[WhatsApp Queue] Success - Lead ID: ${job.lead_id}, Message ID: ${result.messageId}`);
            
            // 4. Update queue to SENT
            await db.query(`
                UPDATE whatsapp_message_queue 
                SET status = 'SENT', sent_at = NOW(), whatsapp_message_id = ?, updated_at = NOW() 
                WHERE id = ?`, 
                [result.messageId, job.id]
            );

            // 5. Insert SUCCESS log into whatsapp_message_logs
            await db.query(`
                INSERT INTO whatsapp_message_logs 
                (queue_id, provider, event_key, lead_type, lead_table, lead_id, telecaller_id, phone_number, normalized_number, template_key, template_name, message_type, status, request_payload, response_payload, sent_at)
                VALUES (?, 'INTERAKT', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TEMPLATE', 'SENT', ?, ?, NOW())
            `, [
                job.id,
                job.event_key || null,
                job.lead_type || null,
                job.lead_table || null,
                job.lead_id || null,
                job.telecaller_id || null,
                job.phone_number || null,
                job.normalized_number || null,
                job.template_key || null,
                job.template_name || null,
                JSON.stringify(requestPayload),
                JSON.stringify(result.response)
            ]);

        } else {
            console.log(`[WhatsApp Queue] Failure - Lead ID: ${job.lead_id}, Error: ${result.error}`);
            
            const currentRetryCount = (job.retry_count || 0);
            
            // 6. If failed, handle retry logic
            if (currentRetryCount < maxRetries) {
                console.log(`[WhatsApp Queue] Retry Scheduled - Lead ID: ${job.lead_id}, Attempt: ${currentRetryCount + 1}/${maxRetries}`);
                await db.query(`
                    UPDATE whatsapp_message_queue 
                    SET status = 'PENDING', error_message = ?, retry_count = retry_count + 1, next_retry_at = DATE_ADD(NOW(), INTERVAL ? MINUTE), updated_at = NOW() 
                    WHERE id = ?`, 
                    [result.error, retryMinutes, job.id]
                );
            } else {
                console.log(`[WhatsApp Queue] Permanently FAILED - Lead ID: ${job.lead_id}, Max retries reached.`);
                await db.query(`
                    UPDATE whatsapp_message_queue 
                    SET status = 'FAILED', error_message = ?, retry_count = retry_count + 1, updated_at = NOW() 
                    WHERE id = ?`, 
                    [result.error, job.id]
                );
            }

            // 7. Insert FAILED log into whatsapp_message_logs
            await db.query(`
                INSERT INTO whatsapp_message_logs 
                (queue_id, provider, event_key, lead_type, lead_table, lead_id, telecaller_id, phone_number, normalized_number, template_key, template_name, message_type, status, request_payload, response_payload, sent_at)
                VALUES (?, 'INTERAKT', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TEMPLATE', 'FAILED', ?, ?, NOW())
            `, [
                job.id,
                job.event_key || null,
                job.lead_type || null,
                job.lead_table || null,
                job.lead_id || null,
                job.telecaller_id || null,
                job.phone_number || null,
                job.normalized_number || null,
                job.template_key || null,
                job.template_name || null,
                JSON.stringify(requestPayload),
                JSON.stringify(result.response)
            ]);
        }

    } catch (error) {
        console.error("[WhatsApp Queue] Processor Exception:", error.message);
    } finally {
        isPolling = false;
    }
};

/**
 * Enqueues a welcome template message for a genuinely new direct lead.
 * Validates the phone number and safely ignores duplicates using event_key.
 */
const enqueueDirectLeadWelcome = async ({ leadId, telecallerId, leadName, phoneNumber }) => {
    try {
        if (!phoneNumber) return;
        
        // Normalize to last 10 digits
        const digitsOnly = String(phoneNumber).replace(/[^0-9]/g, '');
        if (digitsOnly.length < 10) {
            console.log(`[WhatsApp Queue] Ignoring lead ${leadId} - phone number < 10 digits.`);
            return;
        }
        
        const normalizedNumber = digitsOnly.slice(-10);
        const eventKey = `DIRECT_INITIAL:${leadId}`;
        
        // Check for duplicates
        const [existing] = await db.query(`SELECT id FROM whatsapp_message_queue WHERE event_key = ?`, [eventKey]);
        if (existing.length > 0) {
            console.log(`[WhatsApp Queue] Skipped duplicate enqueue for lead ${leadId} (event_key: ${eventKey}).`);
            return;
        }
        
        const templateConfig = await getAssignedTemplate('DIRECT_LEAD_WELCOME');
        
        const context = { leadType: 'DIRECT', leadId, telecallerId, leadName, phoneNumber };
        const renderedParams = await renderTemplateVariables(templateConfig.body_variable_mapping, context);
        const templateParams = JSON.stringify(renderedParams);
        const templateHeaderValues = templateConfig.header_media_url ? JSON.stringify([templateConfig.header_media_url]) : null;
        
        await db.query(`
            INSERT INTO whatsapp_message_queue (
                lead_type, lead_table, lead_id, telecaller_id, lead_name, 
                phone_number, normalized_number, trigger_type, template_key, 
                template_name, template_language, template_header_type, template_header_values, template_params, template_body_variable_mapping, message_type, status, event_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(), NOW())
        `, [
            'DIRECT',
            'direct_leads',
            leadId,
            telecallerId || null,
            leadName,
            phoneNumber,
            normalizedNumber,
            'DIRECT_LEAD_CREATED',
            'DIRECT_LEAD_CREATED_THANK_YOU',
            templateConfig.template_name,
            templateConfig.language_code,
            templateConfig.header_type,
            templateHeaderValues,
            templateParams,
            JSON.stringify(templateConfig.body_variable_mapping || ["customer_name"]),
            'TEMPLATE',
            eventKey
        ]);
        
        console.log(`[WhatsApp Queue] Enqueued WhatsApp welcome for new Direct Lead ID: ${leadId}`);

        // Phase 2: Automation Trigger
        queueAutomations('DIRECT_NEW_LEAD', 'DIRECT', 'direct_leads', leadId, telecallerId || null, phoneNumber, normalizedNumber, {
            customer_name: leadName || 'Valued Customer'
        });
    } catch (error) {
        // We catch here so the caller (syncCampaigns) does not crash on DB errors
        console.error(`[WhatsApp Queue] Failed to enqueue welcome for lead ${leadId}:`, error.message);
        throw error;
    }
};
/**
 * Starts the WhatsApp queue processor loop.
 */
const startWhatsAppQueueProcessor = () => {
    if (pollingInterval) {
        console.log("[WhatsApp Queue] Processor is already running.");
        return;
    }
    
    console.log("[WhatsApp Queue] Starting processor (5 second interval).");
    // Run every 5 seconds
    pollingInterval = setInterval(async () => {
        await processNextJob();
    }, 5000);
    
    // Trigger first run immediately
    processNextJob();
};

/**
 * Stops the WhatsApp queue processor loop.
 */
const stopWhatsAppQueueProcessor = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("[WhatsApp Queue] Processor stopped.");
    }
};

/**
 * Enqueues a welcome template message for a genuinely new BOT lead.
 * Validates the phone number and safely ignores duplicates using event_key.
 */
const enqueueBotLeadWelcome = async ({ leadId, leadTable = 'new_leads', telecallerId = null, leadName, phoneNumber }) => {
    try {
        if (!leadId) {
            return { success: false, queued: false, queueId: null, duplicate: false, message: 'Invalid leadId' };
        }
        
        if (!phoneNumber) {
            return { success: false, queued: false, queueId: null, duplicate: false, message: 'Missing phone number' };
        }
        
        // Normalize to last 10 digits
        const digitsOnly = String(phoneNumber).replace(/[^0-9]/g, '');
        if (digitsOnly.length < 10) {
            console.log(`[WhatsApp Queue] Invalid BOT phone skipped for lead ID: ${leadId}`);
            return { success: false, queued: false, queueId: null, duplicate: false, message: 'Phone number < 10 digits' };
        }
        
        const normalizedNumber = digitsOnly.slice(-10);
        const eventKey = `BOT_INITIAL:${leadTable}:${leadId}`;
        const finalLeadName = leadName ? String(leadName).trim() : 'Customer';
        
        // Check for duplicates
        const [existing] = await db.query(`SELECT id FROM whatsapp_message_queue WHERE event_key = ?`, [eventKey]);
        if (existing.length > 0) {
            console.log(`[WhatsApp Queue] Duplicate BOT welcome skipped for lead ID: ${leadId}`);
            return { success: true, queued: false, queueId: null, duplicate: true };
        }
        
        const templateConfig = await getAssignedTemplate('BOT_LEAD_WELCOME');
        
        const context = { leadType: 'BOT', leadId, telecallerId, leadName: finalLeadName, phoneNumber };
        const renderedParams = await renderTemplateVariables(templateConfig.body_variable_mapping, context);
        const templateParams = JSON.stringify(renderedParams);
        const templateHeaderValues = templateConfig.header_media_url ? JSON.stringify([templateConfig.header_media_url]) : null;

        const [insertResult] = await db.query(`
            INSERT INTO whatsapp_message_queue (
                lead_type, lead_table, lead_id, telecaller_id, lead_name, 
                phone_number, normalized_number, trigger_type, template_key, 
                template_name, template_language, template_header_type, template_header_values, template_params, template_body_variable_mapping, message_type, status, event_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(), NOW())
        `, [
            'BOT',
            leadTable,
            leadId,
            telecallerId,
            finalLeadName,
            phoneNumber,
            normalizedNumber,
            'BOT_LEAD_ENTERED_DASHBOARD',
            'BOT_LEAD_CREATED_THANK_YOU',
            templateConfig.template_name,
            templateConfig.language_code,
            templateConfig.header_type,
            templateHeaderValues,
            templateParams,
            JSON.stringify(templateConfig.body_variable_mapping || ["customer_name"]),
            'TEMPLATE',
            eventKey
        ]);
        
        // If INSERT IGNORE skips due to unique constraint, insertId will be 0
        if (insertResult.insertId === 0) {
            console.log(`[WhatsApp Queue] Duplicate BOT welcome skipped for lead ID: ${leadId}`);
            return { success: true, queued: false, queueId: null, duplicate: true };
        }
        
        console.log(`[WhatsApp Queue] Enqueued BOT welcome for lead ID: ${leadId}`);

        // Phase 2: Automation Trigger
        queueAutomations('BOT_NEW_LEAD', 'BOT', leadTable, leadId, telecallerId, phoneNumber, normalizedNumber, {
            customer_name: leadName || 'Valued Customer'
        });
        
        return { success: true, queued: true, queueId: insertResult.insertId, duplicate: false };
    } catch (error) {
        // We catch here so the caller does not crash on DB errors
        console.error(`[WhatsApp Queue] Failed to enqueue BOT welcome for lead ${leadId}:`, error.message);
        throw error;
    }
};

module.exports = {
    startWhatsAppQueueProcessor,
    stopWhatsAppQueueProcessor,
    processNextJob,
    enqueueDirectLeadWelcome,
    enqueueBotLeadWelcome
};
