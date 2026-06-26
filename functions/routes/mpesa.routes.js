const express = require("express");

const { initiateStkPush } = require("../controllers/stkPush.controller");
const { mpesaStkCallback } = require("../controllers/callback.controller");

const router = express.Router();

router.post("/stk-push", initiateStkPush);
router.post("/callback", mpesaStkCallback);

module.exports = router;
