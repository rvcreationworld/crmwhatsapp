const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Compatibility Routes
router.post("/login", authController.login);
router.post("/admin-login", authController.login);
router.post("/telecaller-login", authController.login);

router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
