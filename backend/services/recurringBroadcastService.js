const db = require('../config/db');
const moment = require('moment-timezone');

const TIMEZONE = 'Asia/Kolkata';

/**
 * Evaluates whether a broadcast rule is due to execute.
 */
const isBroadcastDue = (broadcast, now) => {
    const { schedule_type, daily_time, week_day, month_day, last_execution_datetime } = broadcast;

    const [hours, minutes] = daily_time.split(':');
    
    // We want to evaluate if today's trigger time has passed in Asia/Kolkata
    const triggerTimeToday = moment.tz(now, TIMEZONE).startOf('day').hours(hours).minutes(minutes).seconds(0).milliseconds(0);
    
    if (now.isBefore(triggerTimeToday)) {
        return false; // Time hasn't reached yet today
    }

    if (last_execution_datetime) {
        const lastRun = moment.tz(last_execution_datetime, TIMEZONE);
        // If it ran on or after today's trigger time, it already executed for this period (mostly daily protection)
        if (lastRun.isSameOrAfter(triggerTimeToday)) {
            return false;
        }
    }

    // Daily: if time has passed and hasn't run today (checked above)
    if (schedule_type === 'DAILY') {
        return true;
    }

    if (schedule_type === 'WEEKLY') {
        const currentDayName = now.format('dddd'); // e.g., 'Monday'
        if (currentDayName !== week_day) return false;
        
        // Ensure it hasn't run in the last 6 days to prevent multiple runs on the same day if time allows
        if (last_execution_datetime) {
            const lastRun = moment.tz(last_execution_datetime, TIMEZONE);
            if (now.diff(lastRun, 'days') < 6) return false; 
        }
        return true;
    }

    if (schedule_type === 'MONTHLY') {
        const currentMonthDay = now.date();
        const daysInMonth = now.daysInMonth();
        
        let targetDay = month_day;
        if (month_day > daysInMonth) {
            targetDay = daysInMonth; // Clamp to end of month
        }

        if (currentMonthDay !== targetDay) return false;

        if (last_execution_datetime) {
            const lastRun = moment.tz(last_execution_datetime, TIMEZONE);
            if (now.isSame(lastRun, 'month') && now.isSame(lastRun, 'year')) {
                return false; // Already ran this month
            }
        }
        return true;
    }

    return false;
};

/**
 * Fetch variables from lead tables for placeholders
 */
const fetchLeadVariables = async (connection, leadTable, leadId) => {
    if (!leadTable || !leadId) return {};

    try {
        if (leadTable === 'direct_leads') {
            const [leads] = await connection.query(`
                SELECT c.lead_name as customer_name, 
                       u.username as rm_name,
                       camp.campaign_name
                FROM direct_leads c
                LEFT JOIN admin_users u ON c.telecaller_id = u.id
                LEFT JOIN common_campaigns camp ON c.campaign_id = camp.id
                WHERE c.id = ?
            `, [leadId]);
            
            if (leads.length > 0) {
                const l = leads[0];
                return {
                    customer_name: l.customer_name || '',
                    company_name: '',
                    website_url: '',
                    rm_name: l.rm_name || '',
                    rm_mobile: '',
                    campaign_name: l.campaign_name || '',
                    lead_type: 'DIRECT'
                };
            }
        } 
        else if (leadTable === 'bot_leads') {
            // bot_leads table might not exist in some schemas, catch safely
            const [leads] = await connection.query(`
                SELECT b.name as customer_name, b.company as company_name, 
                       u.username as rm_name
                FROM bot_leads b
                LEFT JOIN admin_users u ON b.telecaller_id = u.id
                WHERE b.id = ?
            `, [leadId]).catch(() => [[{}]]);

            if (leads && leads.length > 0) {
                const l = leads[0];
                return {
                    customer_name: l.customer_name || '',
                    company_name: l.company_name || '',
                    rm_name: l.rm_name || '',
                    rm_mobile: '',
                    lead_type: 'BOT'
                };
            }
        }
    } catch (e) {
        console.error("Error fetching lead variables:", e.message);
    }
    return {};
};

const processRecurringBroadcasts = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Find enabled broadcasts that are IDLE
        const [broadcasts] = await connection.query(`
            SELECT * FROM whatsapp_recurring_broadcasts 
            WHERE is_enabled = 1 AND execution_status = 'IDLE'
        `);

        if (broadcasts.length === 0) {
            connection.release();
            return;
        }

        const now = moment.tz(TIMEZONE);

        for (const broadcast of broadcasts) {
            if (isBroadcastDue(broadcast, now)) {
                // Determine execution key
                let execKey = '';
                if (broadcast.schedule_type === 'DAILY') {
                    execKey = `broadcast:${broadcast.id}:${now.format('YYYY-MM-DD')}`;
                } else if (broadcast.schedule_type === 'WEEKLY') {
                    execKey = `broadcast:${broadcast.id}:${now.format('YYYY-[W]ww')}`;
                } else if (broadcast.schedule_type === 'MONTHLY') {
                    execKey = `broadcast:${broadcast.id}:${now.format('YYYY-MM')}`;
                }

                // 1. Atomic claim locking
                const [updateRes] = await connection.query(`
                    UPDATE whatsapp_recurring_broadcasts 
                    SET execution_status = 'PROCESSING', processing_started_at = NOW()
                    WHERE id = ? AND execution_status = 'IDLE'
                `, [broadcast.id]);

                if (updateRes.affectedRows === 0) {
                    continue; // Someone else grabbed it
                }

                console.log(`[Recurring Broadcast] Executing ${broadcast.id} (${broadcast.broadcast_name}) with key ${execKey}`);

                try {
                    // 2. Fetch unique eligible conversations (24h window open)
                    const [allConversations] = await connection.query(`
                        SELECT id as conversation_id, lead_id, lead_table, lead_type, telecaller_id, phone_number, normalized_number, last_customer_message_at
                        FROM whatsapp_conversations
                        WHERE last_customer_message_at IS NOT NULL
                        AND last_customer_message_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        ORDER BY last_customer_message_at DESC
                    `);

                    // Deduplicate in memory by normalized_number
                    const uniqueConversationsMap = new Map();
                    for (const conv of allConversations) {
                        if (!uniqueConversationsMap.has(conv.normalized_number)) {
                            uniqueConversationsMap.set(conv.normalized_number, conv);
                        }
                    }
                    const conversations = Array.from(uniqueConversationsMap.values());

                    let successCount = 0;

                    for (const conv of conversations) {
                        // Resolve variables
                        const vars = await fetchLeadVariables(connection, conv.lead_table, conv.lead_id);
                        vars.lead_phone = conv.normalized_number;

                        // Insert tracking record using INSERT IGNORE to prevent duplicates
                        const [trackRes] = await connection.query(`
                            INSERT IGNORE INTO whatsapp_recurring_broadcast_recipients
                            (broadcast_id, execution_key, conversation_id, lead_id, lead_table, lead_type, telecaller_id, phone_number, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')
                        `, [
                            broadcast.id, execKey, conv.conversation_id, conv.lead_id, conv.lead_table, conv.lead_type, conv.telecaller_id, conv.normalized_number
                        ]);

                        if (trackRes.affectedRows === 1) {
                            // Valid unique recipient, insert into automation queue
                            const [queueRes] = await connection.query(`
                                INSERT INTO whatsapp_automation_queue (
                                    automation_id, event_key, trigger_event, lead_type, lead_table, lead_id, telecaller_id,
                                    phone_number, normalized_number, scheduled_at, service_window_expires_at, variables_json,
                                    automation_name_snapshot, message_type_snapshot, text_message_snapshot, media_url_snapshot, 
                                    media_name_snapshot, button_payload_snapshot, list_payload_snapshot, status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(?, INTERVAL 24 HOUR), ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
                            `, [
                                -1, // Use -1 or null for automation_id since it's recurring broadcast
                                `${execKey}:${conv.normalized_number}`, // Unique event key per recipient
                                'RECURRING_BROADCAST', // queue source
                                conv.lead_type, conv.lead_table, conv.lead_id, conv.telecaller_id,
                                conv.phone_number, conv.normalized_number,
                                conv.last_customer_message_at, // expires 24h after this
                                JSON.stringify(vars),
                                broadcast.broadcast_name,
                                broadcast.message_type,
                                broadcast.text_message,
                                broadcast.media_url,
                                null,
                                broadcast.button_payload_json ? JSON.stringify(broadcast.button_payload_json) : null,
                                broadcast.list_payload_json ? JSON.stringify(broadcast.list_payload_json) : null
                            ]);

                            // Update tracking record with queue_id
                            await connection.query(`
                                UPDATE whatsapp_recurring_broadcast_recipients
                                SET queue_id = ? WHERE id = ?
                            `, [queueRes.insertId, trackRes.insertId]);

                            successCount++;
                        }
                    }

                    console.log(`[Recurring Broadcast] Queued ${successCount} recipients for broadcast ${broadcast.id}`);

                    // 3. Mark successful execution
                    await connection.query(`
                        UPDATE whatsapp_recurring_broadcasts
                        SET execution_status = 'IDLE', processing_started_at = NULL, last_execution_datetime = NOW()
                        WHERE id = ?
                    `, [broadcast.id]);

                } catch (err) {
                    console.error(`[Recurring Broadcast] Error executing broadcast ${broadcast.id}:`, err);
                    
                    // Revert lock so it can retry later
                    await connection.query(`
                        UPDATE whatsapp_recurring_broadcasts
                        SET execution_status = 'IDLE', processing_started_at = NULL
                        WHERE id = ?
                    `, [broadcast.id]);
                }
            }
        }

        // Recover stale processing locks (e.g. Node crashed midway, more than 30 mins ago)
        await connection.query(`
            UPDATE whatsapp_recurring_broadcasts
            SET execution_status = 'IDLE', processing_started_at = NULL
            WHERE execution_status = 'PROCESSING' AND processing_started_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        `);

        connection.release();

    } catch (err) {
        if (connection) connection.release();
        console.error(`[Recurring Broadcast] Fatal error:`, err);
    }
};

module.exports = {
    processRecurringBroadcasts
};
