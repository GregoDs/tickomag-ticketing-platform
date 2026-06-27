import { eventImages } from "../assets/eventImages";
import { FUNCTIONS_API_URL } from "./mpesa.service";

let eventListRequest;

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
      .catch((error) => {
        eventListRequest = undefined;
        throw error;
      });
  }
  return eventListRequest;
}

export async function getEvent(eventId) {
  const payload = await fetch(
    `${FUNCTIONS_API_URL}/events/${encodeURIComponent(eventId)}`
  ).then(parseResponse);
  return hydrateEvent(payload.data.event);
}
