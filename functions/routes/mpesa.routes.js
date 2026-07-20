const express = require("express");

const { initiateStkPush, createFreeTicket } = require("../controllers/stkPush.controller");
const { mpesaStkCallback } = require("../controllers/callback.controller");
const { getPaymentStatus,getTicket } = require("../controllers/status.controller");
const { createRateLimiter } = require("../middleware/rate-limit");

const router = express.Router();
const stkPushRateLimit = createRateLimiter({
  name: "mpesa-stk-push",
  limit: 5,
  windowMs:  10 * 60 * 1000,
});
const freeTicketRateLimit = createRateLimiter({
  name: "free-ticket",
  limit: 10,
  windowMs: 10 * 60 * 1000,
});

router.post("/stk-push", stkPushRateLimit, initiateStkPush);
router.post("/free-ticket", freeTicketRateLimit, createFreeTicket);
router.post("/callback", mpesaStkCallback);
router.get("/payment-status/:checkoutRequestID", getPaymentStatus);
router.get("/tickets/:ticketId", getTicket);

module.exports = router;
