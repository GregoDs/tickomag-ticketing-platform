const { db } = require("./firebase.service");

function publicEvent(document) {
  const data = document.data();
  return {
    id: document.id,
    legacyIds: data.legacyIds || [],
    title: data.title,
    eyebrow: data.eyebrow || "",
    description: data.description || "",
    date: data.date,
    endTime: data.endTime || "",
    venue: data.venue,
    area: data.area,
    imageKey: data.imageKey || document.id,
    category: data.category,
    priceFrom: Number(data.priceFrom || 0),
    featured: Boolean(data.featured),
    weekend: Boolean(data.weekend),
    tickets: (data.tickets || []).map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      price: Number(ticket.price),
      availability: ticket.availability,
      maxPerOrder: Number(ticket.maxPerOrder || 10),
    })),
  };
}

async function listPublishedEvents() {
  const snapshot = await db.collection("events")
    .where("status", "==", "published")
    .get();

  return snapshot.docs
    .map(publicEvent)
    .sort((first, second) => new Date(first.date) - new Date(second.date));
}

async function getPublishedEvent(eventId) {
  let document = await db.collection("events").doc(eventId).get();

  if (!document.exists) {
    const aliasSnapshot = await db.collection("events")
      .where("legacyIds", "array-contains", eventId)
      .limit(1)
      .get();
    document = aliasSnapshot.docs[0];
  }

  if (!document?.exists || document.data().status !== "published") return null;
  return publicEvent(document);
}

async function getCheckoutQuote({ eventId, ticketId, quantity, allowFree = false }) {
  const eventDoc = await db.collection("events").doc(eventId).get();
  if (!eventDoc.exists || eventDoc.data().status !== "published") {
    console.log(eventDoc.data());
    const error = new Error("This event is not available for checkout.");
    error.statusCode = 404;
    throw error;
  }

  const event = eventDoc.data();
  const ticket = (event.tickets || []).find((option) => option.id === ticketId);
  if (!ticket) {
    const error = new Error("The selected ticket type does not exist.");
    error.statusCode = 400;
    throw error;
  }

  if (String(ticket.availability).toLowerCase() !== "available") {
    const error = new Error("The selected ticket is not available.");
    error.statusCode = 409;
    throw error;
  }

  const parsedQuantity = Number(quantity);
  const maxPerOrder = Number(ticket.maxPerOrder || 10);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > maxPerOrder) {
    const error = new Error(`Quantity must be between 1 and ${maxPerOrder}.`);
    error.statusCode = 400;
    throw error;
  }

  const unitPrice = Number(ticket.price);
  const total = unitPrice * parsedQuantity;
  if (!Number.isSafeInteger(total) || total < 0 || (!allowFree && total < 1)) {
    const error = new Error("This ticket cannot be paid for through M-Pesa.");
    error.statusCode = 400;
    throw error;
  }

  return {
    event: {
      id: eventDoc.id,
      title: event.title,
      description: event.description || "",
      date: event.date || "",
      endTime: event.endTime || "",
      venue: event.venue || "",
      area: event.area || "",
      category: event.category || "",
      imageKey: event.imageKey || eventDoc.id,
    },
    ticket: {
      id: ticket.id,
      name: ticket.name,
      unitPrice,
      availability: ticket.availability,
    },
    quantity: parsedQuantity,
    total,
    merchantAccount: event.merchantAccount,
  };
}

module.exports = {
  listPublishedEvents,
  getPublishedEvent,
  getCheckoutQuote,
};
