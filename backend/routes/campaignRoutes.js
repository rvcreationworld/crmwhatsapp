const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, adminMiddleware, campaignController.getCampaigns);
router.post("/sync-sheet", authMiddleware, adminMiddleware, campaignController.addGoogleSheetCampaign);
router.post("/:id/sync-now", authMiddleware, adminMiddleware, campaignController.triggerSyncNow);
router.put("/:id/toggle", authMiddleware, adminMiddleware, campaignController.toggleCampaign);
router.patch("/:id/auto-sync", authMiddleware, adminMiddleware, campaignController.toggleAutoSync);
router.put("/:id", authMiddleware, adminMiddleware, campaignController.updateCampaign);
router.delete("/:id", authMiddleware, adminMiddleware, campaignController.deleteCampaign);

module.exports = router;
