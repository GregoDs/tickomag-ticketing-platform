const express = require("express");

const { initiateStkPush } = require("../controllers/stkPush.controller");
const { mpesaStkCallback } = require("../controllers/callback.controller");
const {
  getPaymentStatus,
  getTicket,
} = require("../controllers/status.controller");

const router = express.Router();

router.post("/stk-push", initiateStkPush);
router.post("/callback", mpesaStkCallback);
router.get("/payment-status/:checkoutRequestID", getPaymentStatus);
router.get("/tickets/:ticketId", getTicket);

module.exports = router;
