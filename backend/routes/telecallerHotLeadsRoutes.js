const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const telecallerHotLeadsController = require('../controllers/telecallerHotLeadsController');

// All routes require auth
router.use(authMiddleware);

// Get hot leads for the logged-in telecaller
router.get('/', telecallerHotLeadsController.getHotLeads);

module.exports = router;
