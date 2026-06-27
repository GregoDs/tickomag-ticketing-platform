const eventService = require("../services/event.service");

async function listEvents(req, res) {
  try {
    const events = await eventService.listPublishedEvents();
    return res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    console.error("Event list failed:", error);
    return res.status(500).json({ success: false, message: "Events could not be loaded." });
  }
}

async function getEvent(req, res) {
  try {
    const event = await eventService.getPublishedEvent(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    return res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    console.error("Event fetch failed:", error);
    return res.status(500).json({ success: false, message: "The event could not be loaded." });
  }
}

module.exports = { listEvents, getEvent };
