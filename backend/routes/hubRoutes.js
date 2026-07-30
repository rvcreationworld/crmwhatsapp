const express = require('express');
const router = express.Router();
const hubWebhookController = require('../controllers/hubWebhookController');

// Public route for receiving webhooks forwarded by the Communication Hub
router.post('/webhook', hubWebhookController.handleHubWebhook);

module.exports = router;
