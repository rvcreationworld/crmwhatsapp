const db = require('../config/db');

/**
 * Retrieves the normalized Interakt Agent Email for a given telecaller.
 * Rules:
 * - If telecaller not found -> return 'TELECALLER_NOT_FOUND'
 * - If email is missing -> return 'AGENT_EMAIL_MISSING'
 * - If status is not ACTIVE -> return 'AGENT_NOT_ACTIVE'
 * - Else return normalized email.
 * 
 * Tomorrow, this logic will be used seamlessly before calling the Interakt Assignment API.
 * 
 * @param {number|string} telecallerId 
 * @returns {Promise<string>} The agent email or an error code string
 */
const getAgentEmailForTelecaller = async (telecallerId) => {
    try {
        const [rows] = await db.query(
            "SELECT interakt_agent_email, interakt_agent_status FROM telecaller_master WHERE id = ? AND is_deleted = 0",
            [telecallerId]
        );

        if (rows.length === 0) {
            return 'TELECALLER_NOT_FOUND';
        }

        const telecaller = rows[0];

        if (!telecaller.interakt_agent_email || telecaller.interakt_agent_email.trim() === '') {
            return 'AGENT_EMAIL_MISSING';
        }

        if (telecaller.interakt_agent_status !== 'ACTIVE') {
            return 'AGENT_NOT_ACTIVE';
        }

        return telecaller.interakt_agent_email.trim().toLowerCase();
    } catch (error) {
        console.error("[interaktAgentService] Error retrieving agent email:", error);
        // Fallback to missing instead of throwing to prevent CRM crashes
        return 'AGENT_EMAIL_MISSING';
    }
};

module.exports = {
    getAgentEmailForTelecaller
};
