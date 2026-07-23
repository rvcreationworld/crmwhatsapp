require('dotenv').config({ path: 'backend/.env' });
process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED = 'true';
const { processAutomationQueue } = require('./backend/services/automationQueueService');

(async () => {
    console.log("Starting manual queue processor...");
    try {
        await processAutomationQueue();
        console.log("Finished running processor.");
    } catch (e) {
        console.error("Failed:", e);
    }
    process.exit(0);
})();
