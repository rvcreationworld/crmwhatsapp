const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const adminAnalyticsController = require('../controllers/adminAnalyticsController');

// All routes here are under /api/admin/analytics and require admin auth
router.use(authMiddleware, adminMiddleware);

router.get('/overview', adminAnalyticsController.getOverview);
router.get('/leaderboard', adminAnalyticsController.getLeaderboard);
router.get('/action-center', adminAnalyticsController.getActionCenter);
router.get('/hourly', adminAnalyticsController.getHourlyPattern);

module.exports = router;
