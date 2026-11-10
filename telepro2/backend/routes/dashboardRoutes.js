const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.get("/summary", authMiddleware, adminMiddleware, dashboardController.getSummary);
router.get("/telecaller-summary", authMiddleware, dashboardController.getTelecallerSummary);

// New Analytics Graph Routes
router.get("/lead-source-daily", authMiddleware, adminMiddleware, dashboardController.getLeadSourceDaily);
router.get("/telecaller/lead-source-daily", authMiddleware, dashboardController.getTelecallerLeadSourceDaily);
router.get("/status-updates-daily", authMiddleware, adminMiddleware, dashboardController.getStatusUpdatesDaily);
router.get("/callpulse-daily", authMiddleware, adminMiddleware, dashboardController.getCallPulseDaily);

module.exports = router;
