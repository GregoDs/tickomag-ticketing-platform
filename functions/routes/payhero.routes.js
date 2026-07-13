const express = require("express");

const {initiatePayheroStkPush} = require("../controllers/payheroStk.controller");
const {payheroStkCallback} = require("../controllers/payheroCallback.controller");

const router = express.Router();

router.post("/payhero/stk-push", initiatePayheroStkPush);
router.post("/payhero/callback", payheroStkCallback);

module.export = router;