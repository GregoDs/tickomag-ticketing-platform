import { getTicketRequestByPayment } from "./orders.service";
import { FUNCTIONS_API_URL } from "./mpesa.service";

export async function lookupIssuedTicket(code) {
  const response = await fetch(`${FUNCTIONS_API_URL}/tickets/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "The ticket could not be retrieved.");
  }
  return payload.data.ticket;
}

export async function retrieveIssuedTicket(mpesaCode, phone) {
  const status = await getTicketRequestByPayment(mpesaCode, phone);
  if (!status) return null;
  if (status.approvalStatus !== "approved" || !status.issuedTicket) {
    return { status: status.approvalStatus || "pending", ticket: null };
  }

  return {
    status: "approved",
    ticket: {
      ...status.issuedTicket,
      orderId: status.orderId,
      attendee: status.attendee,
      event: status.event,
      ticket: status.ticket,
      quantity: status.quantity,
      total: status.total,
    },
  };
}
