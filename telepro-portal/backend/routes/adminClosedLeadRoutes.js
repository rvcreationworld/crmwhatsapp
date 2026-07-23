const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminClosedLeadController = require("../controllers/adminClosedLeadController");

// Use admin authorization check here
router.use(authMiddleware.authMiddleware, authMiddleware.adminMiddleware);

router.post("/scan", adminClosedLeadController.scanAndMove);
router.get("/", adminClosedLeadController.getClosedLeads);
router.get("/:id", adminClosedLeadController.getClosedLeadById);

module.exports = router;
