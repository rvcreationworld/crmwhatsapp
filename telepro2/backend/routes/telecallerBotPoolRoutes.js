const express = require("express");
const router = express.Router();
const telecallerBotPoolController = require("../controllers/telecallerBotPoolController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/status", authMiddleware, telecallerBotPoolController.getStatus);
router.post("/fetch", authMiddleware, telecallerBotPoolController.fetchLead);
router.post("/status1", authMiddleware, telecallerBotPoolController.updateStatus1);
router.post("/exit-queue", authMiddleware, telecallerBotPoolController.exitQueue);

module.exports = router;
