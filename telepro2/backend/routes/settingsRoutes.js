const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/", settingsController.getSettings);
router.put("/", settingsController.updateSettings);

router.get("/callpulse-status-rules", settingsController.getCallPulseSettings);
router.put("/callpulse-status-rules", settingsController.updateCallPulseSettings);

module.exports = router;
