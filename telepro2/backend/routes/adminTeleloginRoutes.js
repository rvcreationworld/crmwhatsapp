const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const adminTeleloginController = require("../controllers/adminTeleloginController");

// Use authMiddleware to ensure only logged in users (admins) can access
router.use(authMiddleware);

// Protect route to ensure only ADMIN role can access
router.use(adminMiddleware);

router.get("/telecallers", adminTeleloginController.getTelecallers);
router.get("/logs", adminTeleloginController.getLogs);
router.post("/:telecallerId", adminTeleloginController.impersonateTelecaller);

module.exports = router;
