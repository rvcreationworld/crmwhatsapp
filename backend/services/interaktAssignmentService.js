const axios = require('axios');
const { getAgentEmailForTelecaller } = require('./interaktAgentService');

const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY || '';
// Official Interakt Assignment API endpoint
const INTERAKT_ASSIGN_URL = 'https://api.interakt.ai/v1/public/assignment/';

/**
 * Assigns an Interakt chat to an agent asynchronously based on telecallerId and phoneNumber.
 * Never blocks or crashes the CRM lead assignment.
 * 
 * @param {string} phoneNumber - The user's phone number.
 * @param {string|number} telecallerId - The CRM ID of the telecaller.
 * @returns {Promise<Object>} Result object.
 */
const assignChatToAgent = async (phoneNumber, telecallerId) => {
    try {
        if (!phoneNumber || !telecallerId) {
            console.warn(`[Interakt Assignment] Missing phoneNumber or telecallerId.`);
            return { success: false, reason: 'INVALID_PARAMS' };
        }

        // 1. Get agent email
        const agentEmailStatus = await getAgentEmailForTelecaller(telecallerId);
        
        // Validate
        if (['TELECALLER_NOT_FOUND', 'AGENT_EMAIL_MISSING', 'AGENT_NOT_ACTIVE'].includes(agentEmailStatus)) {
            console.warn(`[Interakt Assignment] Cannot assign chat: ${agentEmailStatus}`);
            return { success: false, reason: agentEmailStatus };
        }

        const agentEmail = agentEmailStatus;
        
        // 2. Format phone number to 919876543210 (remove +, assume India 91 if 10 digits)
        let digitsOnly = String(phoneNumber).replace(/[^0-9]/g, '');
        if (digitsOnly.length === 10) {
            digitsOnly = '91' + digitsOnly;
        }

        const payload = {
            user_phone_number: digitsOnly,
            agent_email: agentEmail
        };

        console.log(`[Interakt Assignment] Assigning chat using Interakt Agent Email... (Phone: ${digitsOnly}, Agent: ${agentEmail})`);

        // 3. Make asynchronous POST request
        const response = await axios.post(INTERAKT_ASSIGN_URL, payload, {
            headers: {
                'Authorization': `Basic ${INTERAKT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10s timeout
        });
        
        console.log(`[Interakt Assignment] Success: Assigned to ${agentEmail}`);
        return { success: true, data: response.data };

    } catch (error) {
        // Must never crash the CRM assignment process
        const statusCode = error.response?.status || 500;
        const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        
        console.error(`[Interakt Assignment] Failed. Status: ${statusCode}`, errorMsg);
        return { success: false, error: 'INTERAKT_API_FAILED', detail: errorMsg };
    }
};

module.exports = { assignChatToAgent };
