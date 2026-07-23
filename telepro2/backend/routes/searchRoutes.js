const express = require("express");
const router = express.Router();
const { searchLeads } = require("../controllers/searchController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, searchLeads);

module.exports = router;
