export function generateQRCodePayload(ticketId, scanToken) {
  return `TM1.${ticketId}.${scanToken}`;
}
