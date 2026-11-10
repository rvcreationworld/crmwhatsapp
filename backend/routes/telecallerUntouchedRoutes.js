const express = require('express');
const router = express.Router();
const untouchedController = require('../controllers/telecallerUntouchedController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, untouchedController.getUntouchedLeads);

module.exports = router;
