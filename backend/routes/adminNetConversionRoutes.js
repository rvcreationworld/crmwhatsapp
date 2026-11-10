const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const adminNetConversionController = require('../controllers/adminNetConversionController');

router.get('/', authMiddleware, adminMiddleware, adminNetConversionController.getNetConversion);

module.exports = router;
