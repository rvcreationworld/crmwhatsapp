const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const telecallerTransferredLeadController = require("../controllers/telecallerTransferredLeadController");

// Use telecaller auth
router.use(authMiddleware.authMiddleware);

router.get("/", telecallerTransferredLeadController.getMyTransferredLeads);
router.get("/:id", telecallerTransferredLeadController.getTransferredLeadDetails);
router.post("/:id/status4", telecallerTransferredLeadController.updateStatus4);

module.exports = router;
