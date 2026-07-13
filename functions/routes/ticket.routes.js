const express = require("express");
const { verifyTicket } = require("../controllers/ticketVerification.controller");
const { lookupTicket } = require("../controllers/status.controller");
const { requireAdmin } = require("../middleware/requireAdmin");
const { createRateLimiter } = require("../middleware/rate-limit");

const router = express.Router();
const ticketVerificationRateLimit = createRateLimiter({
  name: "ticket-verification",
  limit: 180,
  windowMs: 60 * 1000,
});

router.post("/lookup", lookupTicket);
router.post("/verify", ticketVerificationRateLimit, requireAdmin, verifyTicket);

module.exports = router;
