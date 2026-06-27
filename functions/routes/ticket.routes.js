const express = require("express");
const { verifyTicket } = require("../controllers/ticketVerification.controller");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/verify", requireAdmin, verifyTicket);

module.exports = router;
