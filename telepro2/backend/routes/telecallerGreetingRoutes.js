const express = require("express");
const router = express.Router();
const telecallerGreetingController = require("../controllers/telecallerGreetingController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Telecallers only need to get active greetings and mark them as seen
router.get("/active", authMiddleware, telecallerGreetingController.getActiveGreeting);
router.post("/:id/seen", authMiddleware, telecallerGreetingController.markGreetingSeen);

module.exports = router;
