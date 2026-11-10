const express = require("express");
const router = express.Router();
const directLeadsController = require("../controllers/directLeadsController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, directLeadsController.getDirectLeads);
router.put("/:id/status", authMiddleware, directLeadsController.updateStatus);

module.exports = router;
