import { eventImages } from "../assets/eventImages";
import { FUNCTIONS_API_URL } from "./mpesa.service";

let eventListRequest;
const eventCache = new Map();

function hydrateEvent(event) {
  return {
    ...event,
    image: eventImages[event.imageKey] || eventImages.masquerade,
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Events could not be loaded.");
  }
  return payload;
}

export async function getEvents() {
  if (!eventListRequest) {
    eventListRequest = fetch(`${FUNCTIONS_API_URL}/events`)
      .then(parseResponse)
      .then((payload) => payload.data.events.map(hydrateEvent))
      .then((events) => {
        events.forEach((event) => eventCache.set(event.id, event));
        return events;
      })
      .catch((error) => {
        eventListRequest = undefined;
        throw error;
      });
  }
  return eventListRequest;
}

export async function getEvent(eventId) {
  if (eventCache.has(eventId)) {
    return eventCache.get(eventId);
  }

  const payload = await fetch(
    `${FUNCTIONS_API_URL}/events/${encodeURIComponent(eventId)}`
  ).then(parseResponse);
  const event = hydrateEvent(payload.data.event);
  eventCache.set(event.id, event);
  return event;
}
