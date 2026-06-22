import { getTicketRequestByPayment } from "./orders.service";

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
