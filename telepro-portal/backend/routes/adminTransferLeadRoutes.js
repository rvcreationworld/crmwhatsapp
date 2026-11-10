const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminTransferLeadController = require("../controllers/adminTransferLeadController");

router.use(authMiddleware.authMiddleware, authMiddleware.adminMiddleware);

router.get("/", adminTransferLeadController.getTransferLeads);
router.get("/:sourceTable/:leadId", adminTransferLeadController.getLeadDetails);
router.post("/transfer", adminTransferLeadController.transfer);

module.exports = router;
