const express = require("express");
const router = express.Router();
const telecallerMyClientsController = require("../controllers/telecallerMyClientsController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, telecallerMyClientsController.getMyClients);

module.exports = router;
