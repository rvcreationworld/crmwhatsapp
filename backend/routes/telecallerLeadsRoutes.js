const express = require("express");
const router = express.Router();
const telecallerLeadsController = require("../controllers/telecallerLeadsController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Both routes must be authenticated. They inherently use req.user.id
router.get("/summary", authMiddleware, telecallerLeadsController.getSummary);
router.get("/:leadType/:leadId/status-permission", authMiddleware, telecallerLeadsController.checkStatusPermission);
router.get("/", authMiddleware, telecallerLeadsController.getList);

module.exports = router;
