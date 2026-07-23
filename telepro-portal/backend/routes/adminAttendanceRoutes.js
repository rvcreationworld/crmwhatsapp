const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/adminAttendanceController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/telecallers', authMiddleware, adminMiddleware, attendanceController.getTelecallers);
router.get('/daily', authMiddleware, adminMiddleware, attendanceController.getDailyAttendance);
router.post('/daily', authMiddleware, adminMiddleware, attendanceController.saveDailyAttendance);
router.get('/manual/:telecallerId', authMiddleware, adminMiddleware, attendanceController.getManualAttendance);
router.get('/:telecallerId', authMiddleware, adminMiddleware, attendanceController.getAttendance);

module.exports = router;
