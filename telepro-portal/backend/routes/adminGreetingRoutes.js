const express = require("express");
const router = express.Router();
const adminGreetingController = require("../controllers/adminGreetingController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

router.post("/", authMiddleware, adminMiddleware, adminGreetingController.createGreeting);
router.get("/", authMiddleware, adminMiddleware, adminGreetingController.getGreetings);
router.get("/active", authMiddleware, adminMiddleware, adminGreetingController.getActiveGreeting);
router.patch("/:id/deactivate", authMiddleware, adminMiddleware, adminGreetingController.deactivateGreeting);

module.exports = router;
