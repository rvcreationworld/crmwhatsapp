const express = require('express');
const router = express.Router();
const telecallerDirectLeadsController = require('../controllers/telecallerDirectLeadsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/fresh', authMiddleware, telecallerDirectLeadsController.getFreshDirectLeads);
router.post('/:id/status1', authMiddleware, telecallerDirectLeadsController.updateStatus1);

module.exports = router;
