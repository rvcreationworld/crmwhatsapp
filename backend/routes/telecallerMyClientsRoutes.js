const express = require("express");
const router = express.Router();
const telecallerMyClientsController = require("../controllers/telecallerMyClientsController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, telecallerMyClientsController.getMyClients);
router.get("/dhan", authMiddleware, telecallerMyClientsController.getMyDhanClients);

module.exports = router;
