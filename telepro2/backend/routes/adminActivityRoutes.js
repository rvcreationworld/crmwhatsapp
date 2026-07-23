const express = require('express');
const router = express.Router();
const activityController = require('../controllers/adminActivityController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, adminMiddleware, activityController.getLastActivity);

module.exports = router;
