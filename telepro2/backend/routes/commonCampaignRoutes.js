const express = require("express");
const router = express.Router();
const commonCampaignController = require("../controllers/commonCampaignController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, adminMiddleware, commonCampaignController.getCommonCampaign);
router.post("/", authMiddleware, adminMiddleware, commonCampaignController.saveCommonCampaign);
router.post("/sync", authMiddleware, adminMiddleware, commonCampaignController.triggerSyncNow);
router.patch("/status", authMiddleware, adminMiddleware, commonCampaignController.toggleCampaignStatus);
router.patch("/auto-sync", authMiddleware, adminMiddleware, commonCampaignController.toggleAutoSync);

module.exports = router;
