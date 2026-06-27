const express = require("express");
const { listEvents, getEvent } = require("../controllers/event.controller");

const router = express.Router();
router.get("/", listEvents);
router.get("/:eventId", getEvent);

module.exports = router;
