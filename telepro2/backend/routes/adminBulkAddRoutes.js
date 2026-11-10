const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminBulkAddController = require('../controllers/adminBulkAddController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware, adminMiddleware);

router.post('/kyc-done', upload.single('file'), adminBulkAddController.uploadKycDone);
router.post('/under-us', upload.single('file'), adminBulkAddController.uploadUnderUs);
router.get('/history', adminBulkAddController.getHistory);
router.get('/history/:batchId', adminBulkAddController.getBatchResults);

module.exports = router;
