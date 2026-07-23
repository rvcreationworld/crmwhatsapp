const mysql = require('mysql2/promise');
require('dotenv').config();

const { processAutomationQueue } = require('./services/automationQueueService');

async function run() {
  try {
    process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED = 'true';
    console.log("Running automation queue processor manually...");
    await processAutomationQueue();
    console.log("Finished running processor.");
  } catch (err) {
    console.error(err);
  }
}
run();
