function generateTicketCode(ticketId) {
  if (!ticketId || typeof ticketId !== "string") {
    throw new Error("A ticket ID is required to generate a ticket code");
  }

  return `TKM-${ticketId.slice(0, 10).toUpperCase()}`;
}

module.exports = {
  generateTicketCode,
};
