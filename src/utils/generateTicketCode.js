export function generateTicketCode(ticketId) {
  return `TKM-${ticketId.slice(0, 10).toUpperCase()}`;
}
