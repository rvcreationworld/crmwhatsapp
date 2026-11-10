const express = require('express');
const router = express.Router();
const interaktController = require('../controllers/interaktController');

// Public route for receiving Interakt webhooks
// Important: Do not protect this with authMiddleware
router.post('/webhook', interaktController.handleWebhook);

module.exports = router;
