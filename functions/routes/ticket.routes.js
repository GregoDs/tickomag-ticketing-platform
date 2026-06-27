const express = require("express");
const { verifyTicket } = require("../controllers/ticketVerification.controller");
const { lookupTicket } = require("../controllers/status.controller");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/lookup", lookupTicket);
router.post("/verify", requireAdmin, verifyTicket);

module.exports = router;
