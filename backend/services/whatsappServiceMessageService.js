const db = require('../config/db');

const HARDCODED_FALLBACKS = {
    'DIRECT_INTERESTED_RM': 'Hi {{customer_name}} 👋\n\nThank you for showing your interest.\n\nYour Relationship Manager has been assigned.\n\n👤 RM:\n{{rm_name}}\n\n📞 Mobile:\n{{rm_mobile}}\n\nYou may contact your RM directly.\n\nThank you,\nShareShaala Team',
    'BOT_INTERESTED_ACK': 'Thank you for your interest.\n\nYour Relationship Manager will contact you soon.\nStay tuned for more information.\n\nFor more information, visit:\n{{website_url}}',
    'BOT_RM_ASSIGNED': 'Hi {{customer_name}} 👋\n\nYour Relationship Manager has now been assigned.\n\n👤 RM: {{rm_name}}\n📞 Mobile: {{rm_mobile}}\n\nYour RM will contact you soon.\nYou may also contact them directly.\n\nThank you,\nShareShaala Team'
};

const SUPPORTED_VARIABLES = ['customer_name', 'rm_name', 'rm_mobile', 'website_url'];

/**
 * Fetch the active service message from the database.
 * If not found or inactive, throws an error to trigger fallback.
 */
const getServiceMessage = async (messageKey) => {
    try {
        const [rows] = await db.query(
            'SELECT message_body FROM whatsapp_service_messages WHERE message_key = ? AND is_active = 1 LIMIT 1',
            [messageKey]
        );

        if (rows.length > 0) {
            return rows[0].message_body;
        }
        throw new Error(`Message key ${messageKey} not found or inactive`);
    } catch (err) {
        throw err; // Let the caller catch it to trigger fallback
    }
};

/**
 * Safely replaces supported placeholders and rejects unresolved ones.
 */
const processVariables = (template, variables) => {
    let result = template;
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
        for (const match of matches) {
            const key = match.replace(/[{}]/g, '');
            if (!SUPPORTED_VARIABLES.includes(key)) {
                throw new Error(`Unsupported variable: ${key}`);
            }
            const value = variables[key] !== undefined ? String(variables[key]) : '';
            result = result.replace(new RegExp(match, 'g'), value);
        }
    }
    return result;
};

/**
 * Renders the service message. Returns fallback if anything goes wrong.
 */
const renderServiceMessage = async (messageKey, variables = {}) => {
    try {
        const template = await getServiceMessage(messageKey);
        return processVariables(template, variables);
    } catch (err) {
        console.error(`[WhatsAppServiceMessage] Failed to load/render '${messageKey}', using fallback. Error:`, err.message);
        const fallbackTemplate = HARDCODED_FALLBACKS[messageKey] || '';
        try {
            return processVariables(fallbackTemplate, variables);
        } catch (fallbackErr) {
            // Extreme safety: return the raw template without variables if fallback rendering somehow fails
            return fallbackTemplate;
        }
    }
};

module.exports = {
    getServiceMessage,
    renderServiceMessage,
    SUPPORTED_VARIABLES,
    HARDCODED_FALLBACKS
};
