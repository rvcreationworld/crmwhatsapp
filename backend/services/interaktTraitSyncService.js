const db = require('../config/db');
const { trackUser } = require('./interaktService');

/**
 * Synchronizes lead traits (name and assigned RM) with Interakt Contact Profiles.
 * This function operates asynchronously and catches all errors to prevent CRM blocking.
 *
 * @param {string} phoneNumber - The user's phone number
 * @param {string} leadName - The name of the lead
 * @param {string|number} telecallerId - The CRM ID of the assigned telecaller/RM
 * @returns {Promise<void>}
 */
const syncLeadTraits = async (phoneNumber, leadName, telecallerId) => {
    try {
        if (!phoneNumber) return;

        let rmName = 'Unassigned';

        // Fetch the assigned RM's name if a telecallerId is provided
        if (telecallerId) {
            const [rms] = await db.query(
                `SELECT telecaller_name FROM telecaller_master WHERE id = ? AND is_deleted = 0`, 
                [telecallerId]
            );
            if (rms.length > 0 && rms[0].telecaller_name) {
                rmName = rms[0].telecaller_name;
            }
        }

        const traits = {
            name: leadName || 'Customer',
            rm_assigned: rmName
        };

        // Asynchronously call the trackUser API
        await trackUser({
            phoneNumber: phoneNumber,
            traits: traits
        });

    } catch (error) {
        console.error("[Interakt Trait Sync] Failed to sync lead traits:", error);
    }
};

module.exports = { syncLeadTraits };
