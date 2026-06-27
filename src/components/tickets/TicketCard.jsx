import { forwardRef } from "react";
import QRCodeDisplay from "./QRCodeDisplay";

const formatDate = (value) => {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const TicketCard = forwardRef(function TicketCard({ ticket }, ref) {
  const attendeeName = `${ticket.attendee?.firstName || ""} ${ticket.attendee?.lastName || ""}`.trim();
  const isValid = (ticket.status || "active") === "active" && (ticket.scanStatus || "valid") === "valid";

  return (
    <article ref={ref} className="issued-ticket-card">
      <div className="ticket-cut-edge"><span>Cut here</span></div>
      <QRCodeDisplay payload={ticket.qrPayload} ticketCode={ticket.ticketCode} />
      <div className="ticket-card-copy">
        <div className="ticket-card-topline"><span>Admit {ticket.quantity || 1}</span><strong>{isValid ? "Valid ticket" : String(ticket.scanStatus || ticket.status).replaceAll("_", " ")}</strong></div>
        <p>TickoMag presents</p>
        <h2>{ticket.event?.title || "Event ticket"}</h2>
        <dl>
          <div><dt>Date</dt><dd>{formatDate(ticket.event?.date)}</dd></div>
          <div><dt>Venue</dt><dd>{ticket.event?.venue || "Venue to be announced"}</dd></div>
          <div><dt>Ticket</dt><dd>{ticket.ticket?.name || "Admission"} × {ticket.quantity || 1}</dd></div>
          <div><dt>Attendee</dt><dd>{attendeeName || "Ticket holder"}</dd></div>
          <div><dt>Order</dt><dd>{ticket.orderId}</dd></div>
        </dl>
        <small>This QR is valid for one gate scan. Do not share it publicly.</small>
      </div>
    </article>
  );
});

export default TicketCard;
