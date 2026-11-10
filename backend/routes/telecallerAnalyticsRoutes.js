const express = require("express");
const router = express.Router();
const telecallerAnalyticsController = require("../controllers/telecallerAnalyticsController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", telecallerAnalyticsController.getAnalytics);
router.get("/bucket", telecallerAnalyticsController.getBucketDetails);

module.exports = router;
