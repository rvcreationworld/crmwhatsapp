const express = require("express"); 
const router = express.Router(); 
const reportController = require("../controllers/reportController"); 
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware"); 

router.use(authMiddleware, adminMiddleware); 
router.get("/status-summary", reportController.getStatusSummary); 
router.get("/telecaller-performance", reportController.getTelecallerPerformance); 
router.get("/campaign-performance", reportController.getCampaignPerformance);
router.get("/export", reportController.exportData); 

module.exports = router;
