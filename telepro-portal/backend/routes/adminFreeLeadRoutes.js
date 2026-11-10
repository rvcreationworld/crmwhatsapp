const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminFreeLeadController = require('../controllers/adminFreeLeadController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

router.post('/scan', authMiddleware, adminMiddleware, adminFreeLeadController.scanAndMoveLeads);
router.get('/', authMiddleware, adminMiddleware, adminFreeLeadController.getFreeLeads);
router.post('/bulk-upload', authMiddleware, adminMiddleware, upload.single('file'), adminFreeLeadController.bulkUploadLeads);
router.get('/bulk-upload/batches', authMiddleware, adminMiddleware, adminFreeLeadController.getBulkUploadBatches);
router.get('/:id', authMiddleware, adminMiddleware, adminFreeLeadController.getFreeLeadDetails);

module.exports = router;
