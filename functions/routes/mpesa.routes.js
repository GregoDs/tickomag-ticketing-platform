const express = require("express");

const { initiateStkPush } = require("../controllers/stkPush.controller");
const { mpesaStkCallback } = require("../controllers/callback.controller");
const { getPaymentStatus,getTicket } = require("../controllers/status.controller");
const { createRateLimiter } = require("../middleware/rate-limit");

const router = express.Router();
const stkPushRateLimit = createRateLimiter({
  name: "mpesa-stk-push",
  limit: 5,
  windowMs:  10 * 60 * 1000,
});

router.post("/stk-push", stkPushRateLimit, initiateStkPush);
router.post("/callback", mpesaStkCallback);
router.get("/payment-status/:checkoutRequestID", getPaymentStatus);
router.get("/tickets/:ticketId", getTicket);

module.exports = router;
