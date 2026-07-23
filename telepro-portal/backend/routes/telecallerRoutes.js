const express = require("express");
const router = express.Router();
const telecallerController = require("../controllers/telecallerController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

// All telecaller routes are admin only
router.use(authMiddleware, adminMiddleware);

router.get("/", telecallerController.getAll);
router.post("/", telecallerController.create);
router.put("/:id", telecallerController.update);
router.put("/:id/reset-password", telecallerController.resetPassword);

module.exports = router;
