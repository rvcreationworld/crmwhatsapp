const express = require('express');
const router = express.Router();
const botAutoAssignController = require('../controllers/botAutoAssignController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/top-telecallers', authMiddleware, adminMiddleware, botAutoAssignController.getTopTelecallers);
router.get('/status', authMiddleware, adminMiddleware, botAutoAssignController.getStatus);
router.put('/status', authMiddleware, adminMiddleware, botAutoAssignController.updateStatus);

module.exports = router;
