require('dotenv').config();
process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED = 'true';
const { processAutomationQueue } = require('./services/automationQueueService');

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
