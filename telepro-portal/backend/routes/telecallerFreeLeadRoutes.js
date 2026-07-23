const express = require('express');
const router = express.Router();
const telecallerFreeLeadController = require('../controllers/telecallerFreeLeadController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/status', authMiddleware, telecallerFreeLeadController.getFreeLeadsStatus);
router.post('/fetch', authMiddleware, telecallerFreeLeadController.fetchFreeLead);
router.post('/:id/status4', authMiddleware, telecallerFreeLeadController.updateStatus4);
router.get('/my', authMiddleware, telecallerFreeLeadController.getMyFreeLeads);
router.get('/:id', authMiddleware, telecallerFreeLeadController.getFreeLeadDetails);
router.get('/:id/call-logs', authMiddleware, telecallerFreeLeadController.getFreeLeadCallLogs);

module.exports = router;
