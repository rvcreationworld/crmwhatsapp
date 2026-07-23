const axios = require('axios');

/**
 * Interakt API Service Layer
 * This service handles all communications with the Interakt Public API.
 */

// Environment Variables
const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY || '';
const INTERAKT_COUNTRY_CODE = process.env.INTERAKT_COUNTRY_CODE || '+91';
const INTERAKT_TEMPLATE_LANGUAGE = process.env.INTERAKT_TEMPLATE_LANGUAGE || 'en';
const INTERAKT_API_URL = process.env.INTERAKT_API_URL || 'https://api.interakt.ai/v1/public/message/';

// Base Axios Instance
const apiClient = axios.create({
    baseURL: INTERAKT_API_URL,
    timeout: 15000, // 15 seconds timeout
    headers: {
        'Authorization': `Basic ${INTERAKT_API_KEY}`,
        'Content-Type': 'application/json',
    }
});

/**
 * Validates and sanitizes a phone number for Interakt.
 * Removes the country code if present, ensuring it returns exactly 10 digits.
 * 
 * @param {string} phone 
 * @returns {string|null} 10-digit phone number or null if invalid
 */
const sanitizePhoneNumber = (phone) => {
    if (!phone) return null;
    // Strip everything except digits
    let digitsOnly = String(phone).replace(/[^0-9]/g, '');
    
    if (digitsOnly.length >= 10) {
        // Return only the last 10 digits (assumes +91 is the only country code we care about right now)
        return digitsOnly.slice(-10);
    }
    
    return null;
};

/**
 * Sends a Template Message via Interakt API.
 * 
 * @param {Object} params
 * @param {string} params.phoneNumber The recipient's phone number
 * @param {string} params.templateName The approved template name (e.g., 'customerformthankyou')
 * @param {Array<string>} params.bodyValues Array of values to replace variables in the template body
 * @param {string} params.callbackData Optional callback data passed back via webhooks
 * @param {Array<string>} params.headerValues Array of values to replace variables in the template header
 * @param {string} params.languageCode Language code for the template (defaults to INTERAKT_TEMPLATE_LANGUAGE)
 * @returns {Promise<Object>} Standardized response object
 */
const sendTemplateMessage = async ({ phoneNumber, templateName, bodyValues = [], callbackData = "", headerValues = null, languageCode = null }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        console.error(`[Interakt Service] Error: Invalid phone number format provided: ${phoneNumber}`);
        return {
            success: false,
            error: 'Invalid phone number provided. Expected 10 digits.',
            statusCode: null,
            response: {}
        };
    }

    const payload = {
        countryCode: INTERAKT_COUNTRY_CODE,
        phoneNumber: sanitizedNumber,
        type: "Template",
        callbackData: callbackData,
        template: {
            name: templateName,
            languageCode: languageCode || INTERAKT_TEMPLATE_LANGUAGE,
            bodyValues: bodyValues
        }
    };

    if (headerValues && Array.isArray(headerValues) && headerValues.length > 0) {
        payload.template.headerValues = headerValues;
    }

    console.log(`[Interakt Service] Outgoing template: ${templateName} to ${INTERAKT_COUNTRY_CODE}${sanitizedNumber}`);

    try {
        const response = await apiClient.post('', payload);
        
        // Interakt usually returns a message ID in the response (e.g., response.data.id)
        const messageId = response.data?.id || response.data?.data?.message?.id || response.data?.messageId || "";
        
        console.log(`[Interakt Service] Success: Template '${templateName}' sent to ${sanitizedNumber}. Interakt Message ID: ${messageId}`);
        
        return {
            success: true,
            messageId: messageId,
            response: response.data
        };
    } catch (error) {
        // Safely parse the axios error without throwing it
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        
        console.error(`[Interakt Service] API Error: Failed to send template '${templateName}' to ${sanitizedNumber}. Status: ${statusCode}`, errorData);
        
        return {
            success: false,
            error: errorData?.message || error.message || 'Unknown Interakt API error',
            statusCode: statusCode,
            response: errorData
        };
    }
};

/* ==========================================
 * FUTURE PLACEHOLDERS
 * Do not implement logic for these yet.
 * ========================================== */

/**
 * Sends a standard Session/Free-form Message to a user within the 24-hour service window.
 */
const sendSessionMessage = async ({ phoneNumber, messageText }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        console.error(`[Interakt Service] Error: Invalid phone number format provided: ${phoneNumber}`);
        return {
            success: false,
            error: 'Invalid phone number provided. Expected 10 digits.',
            statusCode: null,
            response: {}
        };
    }

    const payload = {
        countryCode: INTERAKT_COUNTRY_CODE,
        phoneNumber: sanitizedNumber,
        type: "Text",
        data: {
            message: messageText
        }
    };

    console.log(`[Interakt Service] Outgoing session message to ${INTERAKT_COUNTRY_CODE}${sanitizedNumber}`);

    try {
        const response = await apiClient.post('', payload);
        const messageId = response.data?.id || response.data?.data?.message?.id || response.data?.messageId || "";
        
        console.log(`[Interakt Service] Success: Session message sent to ${sanitizedNumber}. Interakt Message ID: ${messageId}`);
        
        return {
            success: true,
            messageId: messageId,
            response: response.data
        };
    } catch (error) {
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        
        console.error(`[Interakt Service] API Error: Failed to send session message to ${sanitizedNumber}. Status: ${statusCode}`, errorData);
        
        return {
            success: false,
            error: errorData?.message || error.message || 'Unknown Interakt API error',
            statusCode: statusCode,
            response: errorData
        };
    }
};

/**
 * Tracks a user on Interakt to sync their traits/details.
 * @param {Object} params
 * @param {string} params.phoneNumber The user's phone number
 * @param {Object} params.traits Key-value pairs of user attributes
 * @returns {Promise<Object>} Standardized response object
 */
const trackUser = async ({ phoneNumber, traits = {} }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        console.error(`[Interakt Service] Error: Invalid phone number format provided for trackUser: ${phoneNumber}`);
        return { success: false, error: 'Invalid phone number format' };
    }

    const payload = {
        phoneNumber: sanitizedNumber,
        countryCode: INTERAKT_COUNTRY_CODE,
        traits: traits
    };

    console.log(`[Interakt Service] Outgoing trackUser payload for ${INTERAKT_COUNTRY_CODE}${sanitizedNumber}:`, traits);

    try {
        // Track User endpoint overrides the base URL's /message path
        const trackUrl = 'https://api.interakt.ai/v1/public/track/users/';
        const response = await apiClient.post(trackUrl, payload);
        
        console.log(`[Interakt Service] Success: trackUser completed for ${sanitizedNumber}`);
        
        return {
            success: true,
            response: response.data
        };
    } catch (error) {
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        
        console.error(`[Interakt Service] API Error: Failed to trackUser for ${sanitizedNumber}. Status: ${statusCode}`, errorData);
        
        return {
            success: false,
            error: errorData?.message || error.message || 'Unknown Interakt API error',
            statusCode: statusCode,
            response: errorData
        };
    }
};

const sendMediaMessage = async ({ phoneNumber, type, mediaUrl, messageText }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        return { success: false, error: 'Invalid phone number provided. Expected 10 digits.', statusCode: null, response: {} };
    }

    const payload = {
        countryCode: INTERAKT_COUNTRY_CODE,
        phoneNumber: sanitizedNumber,
        type: type, // 'Image', 'Video', 'Document', 'Audio'
        data: {
            mediaUrl: mediaUrl
        }
    };
    if (messageText && type !== 'Audio') {
        payload.data.message = messageText;
    }

    try {
        const response = await apiClient.post('', payload);
        const messageId = response.data?.id || response.data?.data?.message?.id || response.data?.messageId || "";
        return { success: true, messageId: messageId, response: response.data };
    } catch (error) {
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        console.error(`[Interakt Service] API Error: Failed to send ${type} to ${sanitizedNumber}.`, errorData);
        return { success: false, error: errorData?.message || error.message || 'Unknown API error', statusCode: statusCode, response: errorData };
    }
};

const sendImageMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Image', mediaUrl, messageText });
const sendVideoMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Video', mediaUrl, messageText });
const sendDocumentMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Document', mediaUrl, messageText });
const sendAudioMessage = async ({ phoneNumber, mediaUrl }) => sendMediaMessage({ phoneNumber, type: 'Audio', mediaUrl });

const sendInteractiveButtonMessage = async ({ phoneNumber, buttonPayload }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
    if (!sanitizedNumber) return { success: false, error: 'Invalid phone number' };

    const payload = {
        countryCode: INTERAKT_COUNTRY_CODE,
        phoneNumber: sanitizedNumber,
        type: 'Interactive',
        data: buttonPayload
    };

    try {
        const response = await apiClient.post('', payload);
        const messageId = response.data?.id || response.data?.data?.message?.id || response.data?.messageId || "";
        return { success: true, messageId: messageId, response: response.data };
    } catch (error) {
        console.error(`[Interakt Service] Error sending Button message`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

const sendInteractiveListMessage = async ({ phoneNumber, listPayload }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
    if (!sanitizedNumber) return { success: false, error: 'Invalid phone number' };

    const payload = {
        countryCode: INTERAKT_COUNTRY_CODE,
        phoneNumber: sanitizedNumber,
        type: 'Interactive',
        data: listPayload
    };

    try {
        const response = await apiClient.post('', payload);
        const messageId = response.data?.id || response.data?.data?.message?.id || response.data?.messageId || "";
        return { success: true, messageId: messageId, response: response.data };
    } catch (error) {
        console.error(`[Interakt Service] Error sending List message`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Tracks a custom event for a user on Interakt.
 */
const trackEvent = async ({ userId, eventName, traits }) => {
    throw new Error("Not implemented yet");
};

/**
 * Fetches a user's profile/status from Interakt.
 */
const getUser = async ({ phoneNumber }) => {
    throw new Error("Not implemented yet");
};

module.exports = {
    sendTemplateMessage,
    sendSessionMessage,
    sendImageMessage,
    sendVideoMessage,
    sendDocumentMessage,
    sendAudioMessage,
    sendInteractiveButtonMessage,
    sendInteractiveListMessage,
    trackUser,
    trackEvent,
    getUser
};
