const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const adminTransferredLeadController = require("../controllers/adminTransferredLeadController");

router.get("/:id/details", authMiddleware, adminMiddleware, adminTransferredLeadController.getTransferredLeadDetails);

module.exports = router;
