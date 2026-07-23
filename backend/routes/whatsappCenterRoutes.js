const express = require('express');
const router = express.Router();
const whatsappCenterController = require('../controllers/whatsappCenterController');
const whatsappAutomationController = require('../controllers/whatsappAutomationController');
const whatsappTemplateController = require('../controllers/whatsappTemplateController');
const whatsappMediaController = require('../controllers/whatsappMediaController');
const whatsappRecurringBroadcastController = require('../controllers/whatsappRecurringBroadcastController');
const whatsappAgentsController = require('../controllers/whatsappAgentsController');
const { handleMediaUpload } = require('../middlewares/whatsappMediaUpload');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/overview', whatsappCenterController.getOverview);
router.get('/conversations', whatsappCenterController.getConversations);
router.get('/logs', whatsappCenterController.getLogs);
router.get('/queue', whatsappCenterController.getQueue);
router.get('/inbound', whatsappCenterController.getInbound);
router.get('/settings', whatsappCenterController.getSettings);
router.get('/service-messages', whatsappCenterController.getServiceMessages);
router.put('/service-messages/:messageKey', whatsappCenterController.updateServiceMessage);

// Automation Messages Routes
router.get('/automations', whatsappAutomationController.getAutomations);
router.post('/automations', whatsappAutomationController.createAutomation);
router.put('/automations/:id', whatsappAutomationController.updateAutomation);
router.delete('/automations/:id', whatsappAutomationController.deleteAutomation);
router.post('/automations/:id/test', whatsappAutomationController.sendTest);

// Recurring Broadcasts Routes
router.get('/recurring-broadcasts', whatsappRecurringBroadcastController.getBroadcasts);
router.post('/recurring-broadcasts', whatsappRecurringBroadcastController.createBroadcast);
router.put('/recurring-broadcasts/:id', whatsappRecurringBroadcastController.updateBroadcast);
router.delete('/recurring-broadcasts/:id', whatsappRecurringBroadcastController.deleteBroadcast);

// Template Management routes
router.get('/templates', whatsappTemplateController.getTemplates);
router.post('/templates', whatsappTemplateController.createTemplate);
router.put('/templates/:id', whatsappTemplateController.updateTemplate);
router.put('/template-assignments/:assignmentKey', whatsappTemplateController.assignTemplate);

// Media Library routes
router.get('/media', whatsappMediaController.getMedia);
router.post('/media/upload', handleMediaUpload, whatsappMediaController.uploadMedia);
router.delete('/media/:id', whatsappMediaController.deleteMedia);

// Interakt Agents (Bulk UI) routes
router.get('/interakt-agents', whatsappAgentsController.getAgents);
router.put('/interakt-agents/:id', whatsappAgentsController.updateAgent);

module.exports = router;
