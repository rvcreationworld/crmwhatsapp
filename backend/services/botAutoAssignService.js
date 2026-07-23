const db = require('../config/db');
const { getEligibleTop10FromCache } = require('./botTop10Service');
const { checkEligibility } = require('./botQueueProcessor');
const { assignChatToAgent } = require('./interaktAssignmentService');
const { syncLeadTraits } = require('./interaktTraitSyncService');

const assignAutoTop10Lead = async () => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Lock state row
        const [stateRows] = await connection.query(`SELECT * FROM bot_auto_assign_state WHERE id = 1 FOR UPDATE`);
        if (stateRows.length === 0 || stateRows[0].is_enabled === 0) {
            await connection.rollback();
            return { result: 'DISABLED' };
        }
        const state = stateRows[0];

        // 2. Re-check for valid manual WAITING request
        const [waitingQueue] = await connection.query(
            `SELECT telecaller_id FROM bot_lead_fetch_queue WHERE status = 'WAITING' ORDER BY queued_at ASC LIMIT 1`
        );
        if (waitingQueue.length > 0) {
            await connection.rollback();
            return { result: 'MANUAL_QUEUE_APPEARED' };
        }

        // 3. Get Eligible Top 10
        const eligibleTop10 = await getEligibleTop10FromCache();
        if (eligibleTop10.length === 0) {
            await connection.rollback();
            return { result: 'NO_ELIGIBLE_TELECALLER' };
        }

        // 4. Determine next telecaller
        let nextTelecaller = null;
        let rankPosition = null;
        let totalCallTime = null;

        if (!state.last_telecaller_id) {
            nextTelecaller = eligibleTop10[0].telecaller_id;
            rankPosition = eligibleTop10[0].rank_position;
            totalCallTime = eligibleTop10[0].total_call_time_seconds;
        } else {
            const lastIndex = eligibleTop10.findIndex(tc => tc.telecaller_id === state.last_telecaller_id);
            if (lastIndex === -1 || lastIndex === eligibleTop10.length - 1) {
                nextTelecaller = eligibleTop10[0].telecaller_id;
                rankPosition = eligibleTop10[0].rank_position;
                totalCallTime = eligibleTop10[0].total_call_time_seconds;
            } else {
                nextTelecaller = eligibleTop10[lastIndex + 1].telecaller_id;
                rankPosition = eligibleTop10[lastIndex + 1].rank_position;
                totalCallTime = eligibleTop10[lastIndex + 1].total_call_time_seconds;
            }
        }

        // 5. Removed final eligibility check as Auto Assign must bypass all manual fetch restrictions.

        // 6. Lock one BOT lead
        const [leads] = await connection.query(
            `SELECT * FROM new_leads ORDER BY id DESC LIMIT 1 FOR UPDATE SKIP LOCKED`
        );

        if (leads.length === 0) {
            await connection.rollback();
            return { result: 'NO_LEADS' };
        }

        const lead = leads[0];

        // 7. Insert into working_sheet
        const [insertRes] = await connection.query(
            `INSERT INTO working_sheet (lead_name, lead_contact, telecaller_id, source, is_active, created_at)
             VALUES (?, ?, ?, 'BOT_AUTO_ASSIGN', 1, NOW())`,
            [lead.lead_name, lead.lead_contact, nextTelecaller]
        );
        const newWorkingSheetId = insertRes.insertId;

        // 8. Migrate whatsapp_conversations
        await connection.query(`
            UPDATE whatsapp_conversations
            SET lead_table = 'working_sheet', lead_id = ?, telecaller_id = ?, updated_at = NOW()
            WHERE lead_type = 'BOT' AND lead_table = 'new_leads' AND lead_id = ?
        `, [newWorkingSheetId, nextTelecaller, lead.id]);

        // 8.1 Migrate whatsapp_message_queue to maintain webhook linkage
        await connection.query(`
            UPDATE whatsapp_message_queue
            SET lead_table = 'working_sheet', lead_id = ?
            WHERE lead_type = 'BOT' AND lead_table = 'new_leads' AND lead_id = ?
        `, [newWorkingSheetId, lead.id]);

        // 9. Delete from new_leads
        await connection.query(`DELETE FROM new_leads WHERE id = ?`, [lead.id]);

        // 10. Update state
        await connection.query(`UPDATE bot_auto_assign_state SET last_telecaller_id = ? WHERE id = 1`, [nextTelecaller]);

        // 11. Insert history
        await connection.query(`
            INSERT INTO bot_lead_assignment_history 
            (original_new_lead_id, working_sheet_id, telecaller_id, assignment_mode, top10_rank_at_assignment, total_call_time_snapshot)
            VALUES (?, ?, ?, 'AUTO_TOP10', ?, ?)
        `, [lead.id, newWorkingSheetId, nextTelecaller, rankPosition, totalCallTime]);

        await connection.commit();
        
        // 12. Asynchronously trigger Interakt Chat Assignment (new API without wc_id)
        assignChatToAgent(lead.lead_contact, nextTelecaller).catch(console.error);

        // 13. Asynchronously sync Lead Traits (Name & RM) to Interakt
        syncLeadTraits(lead.lead_contact, lead.lead_name, nextTelecaller).catch(console.error);

        return { result: 'ASSIGNED', workingSheetId: newWorkingSheetId, telecallerId: nextTelecaller };
    } catch (err) {
        await connection.rollback();
        console.error("[BotAutoAssign] Transaction failed:", err);
        throw err;
    } finally {
        connection.release();
    }
};

module.exports = {
    assignAutoTop10Lead
};
