const db = require('../config/db');

/**
 * Resolves template variable mappings dynamically.
 * 
 * @param {Array|string|null} mapping JSON array of mapped variable keys
 * @param {Object} context Context object containing lead details
 * @returns {Promise<Array>} Array of resolved strings exactly matching mapping length
 */
const renderTemplateVariables = async (mapping, context) => {
    // 1. Backward Compatibility & Null checking
    if (!mapping) {
        mapping = ["customer_name"];
    } else if (typeof mapping === 'string') {
        try {
            mapping = JSON.parse(mapping);
        } catch (e) {
            mapping = ["customer_name"];
        }
    }
    
    if (!Array.isArray(mapping)) {
        console.warn("[TemplateResolver] Invalid mapping format. Defaulting to customer_name.");
        mapping = ["customer_name"];
    }

    if (mapping.length === 0) return [];

    // 2. Extract Context
    const { leadType, leadId, telecallerId, leadName, phoneNumber } = context;

    // 3. Gather Static & Env Data
    let companyName = process.env.COMPANY_NAME || 'ShareShaala';
    let companyWebsite = process.env.COMPANY_WEBSITE || 'https://www.shareshaala.com';

    try {
        const [settings] = await db.query(`SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('COMPANY_NAME', 'COMPANY_WEBSITE')`);
        settings.forEach(s => {
            if (s.setting_key === 'COMPANY_NAME' && s.setting_value) companyName = s.setting_value;
            if (s.setting_key === 'COMPANY_WEBSITE' && s.setting_value) companyWebsite = s.setting_value;
        });
    } catch (e) {
        console.warn("[TemplateResolver] Could not fetch settings. Using .env defaults.");
    }

    // 4. Gather Lead & RM Data
    let dbLeadName = leadName || '';
    let dbPhoneNumber = phoneNumber || '';
    let campaignName = '';
    
    if (leadId && leadType === 'DIRECT') {
        try {
            const [leads] = await db.query(`
                SELECT d.lead_name, d.lead_contact, c.campaign_name
                FROM direct_leads d
                LEFT JOIN common_campaigns c ON d.campaign_id = c.id
                WHERE d.id = ?
            `, [leadId]);
            if (leads.length > 0) {
                dbLeadName = leads[0].lead_name || dbLeadName;
                dbPhoneNumber = leads[0].lead_contact || dbPhoneNumber;
                campaignName = leads[0].campaign_name || '';
            }
        } catch (e) {
            console.warn(`[TemplateResolver] Failed to fetch DIRECT lead ${leadId}`);
        }
    } else if (leadId && leadType === 'BOT') {
        try {
            const [leads] = await db.query(`SELECT lead_name, lead_contact FROM new_leads WHERE id = ?`, [leadId]);
            if (leads.length > 0) {
                dbLeadName = leads[0].lead_name || dbLeadName;
                dbPhoneNumber = leads[0].lead_contact || dbPhoneNumber;
            }
        } catch (e) {
            console.warn(`[TemplateResolver] Failed to fetch BOT lead ${leadId}`);
        }
    }

    let rmName = '';
    let rmMobile = '';
    if (telecallerId) {
        try {
            const [rms] = await db.query(`SELECT telecaller_name, tele_mobile FROM telecaller_master WHERE id = ?`, [telecallerId]);
            if (rms.length > 0) {
                rmName = rms[0].telecaller_name || '';
                rmMobile = rms[0].tele_mobile || '';
            }
        } catch (e) {
            console.warn(`[TemplateResolver] Failed to fetch RM ${telecallerId}`);
        }
    }

    // 5. Build Local Dictionary
    const variables = {
        customer_name: dbLeadName,
        campaign_name: campaignName,
        rm_name: rmName,
        rm_mobile: rmMobile,
        lead_phone: dbPhoneNumber,
        website_url: companyWebsite,
        company_name: companyName,
        lead_type: leadType || ''
    };

    // 6. Resolve Output Array
    const bodyValues = [];

    for (let i = 0; i < mapping.length; i++) {
        let item = mapping[i];
        
        if (typeof item === 'object' && item !== null && item.type === 'custom') {
            bodyValues.push(String(item.value || ''));
        } else if (typeof item === 'string') {
            if (variables[item] !== undefined) {
                bodyValues.push(String(variables[item] || ''));
            } else {
                console.warn(`[TemplateResolver] Unknown mapped variable: ${item}`);
                bodyValues.push(""); // Graceful missing variable fallback
            }
        } else {
            bodyValues.push("");
        }
    }

    return bodyValues;
};

module.exports = {
    renderTemplateVariables
};
