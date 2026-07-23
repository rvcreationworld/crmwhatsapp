const mysql = require('mysql2/promise');
require('dotenv').config();

const { processAutomationQueue } = require('./services/automationQueueService');

async function run() {
  try {
    process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED = 'true';
    console.log("Draining queue...");
    for (let i = 0; i < 10; i++) {
        await processAutomationQueue();
    }
    console.log("Finished running processor 10 times.");
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
}
run();
