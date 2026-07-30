const axios = require('axios');

/**
 * Communication Hub Service Layer
 * This service handles all outbound communications by passing them to the standalone Communication Hub.
 * It replaces direct calls to Interakt.
 */

const COMM_HUB_API_URL = process.env.COMM_HUB_API_URL || 'http://localhost:5001/api/v1/messages/send';
const COMM_HUB_API_KEY = process.env.COMM_HUB_API_KEY || '';
const COMM_HUB_API_SECRET = process.env.COMM_HUB_API_SECRET || '';

const hubClient = axios.create({
    baseURL: COMM_HUB_API_URL,
    timeout: 10000,
    headers: {
        'x-api-key': COMM_HUB_API_KEY,
        'x-api-secret': COMM_HUB_API_SECRET,
        'Content-Type': 'application/json',
    }
});

const sanitizePhoneNumber = (phone) => {
    if (!phone) return null;
    let digitsOnly = String(phone).replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 10) {
        return digitsOnly.slice(-10);
    }
    return null;
};

/**
 * Sends a Template Message by enqueueing it in the Communication Hub.
 */
const sendTemplateMessage = async ({ phoneNumber, templateName, bodyValues = [], callbackData = "", headerValues = null, languageCode = null }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        console.error(`[Hub Service] Error: Invalid phone number format provided: ${phoneNumber}`);
        return { success: false, error: 'Invalid phone number provided. Expected 10 digits.', statusCode: null, response: {} };
    }

    const payload = {
        channel: 'whatsapp',
        source: 'telepro-crm',
        recipient_phone: `+91${sanitizedNumber}`,
        template_name: templateName,
        variables_json: {
            languageCode: languageCode || 'en',
            headerValues: headerValues || [],
            bodyValues: bodyValues || [],
            buttonValues: {},
            callbackData // Passing callback data so the hub can send it back in webhooks later
        },
        priority: 0 // Optional, but good for queuing
    };

    console.log(`[Hub Service] Queuing template: ${templateName} to +91${sanitizedNumber} via Hub`);

    try {
        const response = await hubClient.post('', payload);
        console.log(`[Hub Service] Success: Template '${templateName}' queued in Hub. Hub Queue ID: ${response.data.queue_id}`);
        
        // Return a mock messageId for TelePro's internal logging until webhook updates it
        return {
            success: true,
            messageId: `hub_req_${response.data.request_id}`,
            response: response.data
        };
    } catch (error) {
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        
        console.error(`[Hub Service] API Error: Failed to queue template '${templateName}'. Status: ${statusCode}`, errorData);
        
        return {
            success: false,
            error: errorData?.error || errorData?.message || error.message || 'Unknown Hub API error',
            statusCode: statusCode,
            response: errorData
        };
    }
};

/**
 * Sends a standard Session/Free-form Message.
 * Currently, Hub only officially supports Templates in Phase 2, but we pass it anyway.
 */
const sendSessionMessage = async ({ phoneNumber, messageText }) => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);

    if (!sanitizedNumber) {
        console.error(`[Hub Service] Error: Invalid phone number format provided: ${phoneNumber}`);
        return { success: false, error: 'Invalid phone number provided. Expected 10 digits.', statusCode: null, response: {} };
    }

    const payload = {
        channel: 'whatsapp',
        source: 'telepro-crm',
        recipient_phone: `+91${sanitizedNumber}`,
        template_name: 'SESSION',
        variables_json: {
            messageText: messageText
        },
        priority: 1 // Higher priority for session messages
    };

    console.log(`[Hub Service] Queuing session message to +91${sanitizedNumber} via Hub`);

    try {
        const response = await hubClient.post('', payload);
        return {
            success: true,
            messageId: `hub_req_${response.data.request_id}`,
            response: response.data
        };
    } catch (error) {
        const statusCode = error.response?.status || null;
        const errorData = error.response?.data || error.message;
        console.error(`[Hub Service] API Error: Failed to queue session message. Status: ${statusCode}`, errorData);
        return {
            success: false,
            error: errorData?.error || errorData?.message || error.message || 'Unknown Hub API error',
            statusCode: statusCode,
            response: errorData
        };
    }
};

const trackUser = async ({ phoneNumber, traits = {} }) => {
    // TODO: Communication Hub doesn't support trackUser yet.
    console.error(`[Hub Service] trackUser is not supported by Communication Hub yet.`);
    return { success: false, error: 'Not implemented in Hub' };
};

const sendMediaMessage = async ({ phoneNumber, type, mediaUrl, messageText }) => {
    console.error(`[Hub Service] sendMediaMessage is not supported by Communication Hub yet.`);
    return { success: false, error: 'Not implemented in Hub' };
};

const sendImageMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Image', mediaUrl, messageText });
const sendVideoMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Video', mediaUrl, messageText });
const sendDocumentMessage = async ({ phoneNumber, mediaUrl, messageText }) => sendMediaMessage({ phoneNumber, type: 'Document', mediaUrl, messageText });
const sendAudioMessage = async ({ phoneNumber, mediaUrl }) => sendMediaMessage({ phoneNumber, type: 'Audio', mediaUrl });

const sendInteractiveButtonMessage = async ({ phoneNumber, buttonPayload }) => {
    return { success: false, error: 'Not implemented in Hub' };
};

const sendInteractiveListMessage = async ({ phoneNumber, listPayload }) => {
    return { success: false, error: 'Not implemented in Hub' };
};

const trackEvent = async ({ userId, eventName, traits }) => {
    throw new Error("Not implemented yet");
};

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
