const express = require("express");
const router = express.Router();
const callpulseController = require("../controllers/callpulseController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

// Telecaller APIs (Mobile App)
router.get("/ping", (req, res) => res.json({ success: true, message: "CallPulse API working" }));
router.get("/my-lead-numbers", authMiddleware, callpulseController.getMyLeadNumbers);
router.post("/logs", authMiddleware, callpulseController.uploadLogs);
router.post("/sync", authMiddleware, callpulseController.uploadLogs);
router.post("/agent/register", authMiddleware, callpulseController.registerAgent);
router.post("/agent/heartbeat", authMiddleware, callpulseController.agentHeartbeat);
router.get("/debug/recent", authMiddleware, callpulseController.getDebugRecentLogs);
router.get("/recent", authMiddleware, callpulseController.getTelecallerLogs);

// Telecaller Dashboards
router.get("/telecaller/summary", authMiddleware, callpulseController.getTelecallerSummary);
router.get("/telecaller/logs", authMiddleware, callpulseController.getTelecallerLogs);

// Admin Dashboards
router.get("/admin/summary", authMiddleware, adminMiddleware, callpulseController.getAdminSummary);
router.get("/admin/logs", authMiddleware, adminMiddleware, callpulseController.getAdminLogs);
router.get("/admin/agents/summary", authMiddleware, adminMiddleware, callpulseController.getAdminAgentsSummary);
router.get("/admin/agents/:telecallerId/details", authMiddleware, adminMiddleware, callpulseController.getAdminAgentDetails);

// Common
router.get("/lead-history", authMiddleware, callpulseController.getLeadCallHistory);

module.exports = router;
