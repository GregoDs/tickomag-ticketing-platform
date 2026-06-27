import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import TicketCard from "../../components/tickets/TicketCard";
import TicketStatus from "../../components/tickets/TicketStatus";
import { lookupIssuedTicket } from "../../services/tickets.service";
import { downloadTicketSvg } from "../../utils/downloadTicket";
import "../checkout/Ticket.css";
import "./MyTickets.css";

function MyTickets() {
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const ticketRef = useRef(null);

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  const submit = async (event) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{6,40}$/.test(normalizedCode)) {
      setError("Enter a valid M-Pesa receipt or ticket code.");
      return;
    }

    setIsSearching(true);
    setError("");
    setTicket(null);
    try {
      const foundTicket = await lookupIssuedTicket(normalizedCode);
      setCode(normalizedCode);
      setTicket(foundTicket);
    } catch (lookupError) {
      setError(lookupError.message || "No ticket matches that code.");
    } finally {
      setIsSearching(false);
    }
  };

  const reset = () => {
    setCode("");
    setTicket(null);
    setError("");
  };

  const displayedStatus = ticket?.scanStatus || ticket?.status || "valid";

  return (
    <main className="my-tickets-page">
      <section className="my-tickets-hero">
        <Link to="/">← Back to events</Link>
        <p>{ticket ? "Ticket retrieved" : "My tickets"}</p>
        <h1>{ticket ? <>Your ticket<br /><em>is here.</em></> : <>Find your<br /><em>ticket.</em></>}</h1>
        <span>{ticket
          ? "Keep the QR code ready for verification at the entrance."
          : "Enter either the M-Pesa receipt from your confirmation message or the ticket code shown on your ticket."}</span>
      </section>

      {!ticket ? <section className="ticket-lookup-panel">
        <form onSubmit={submit} noValidate>
          <label htmlFor="ticket-lookup-code">M-Pesa receipt or ticket code</label>
          <div>
            <input id="ticket-lookup-code" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }} placeholder="e.g. UFQH49BPQR or TKM-..." autoComplete="off" maxLength={40} autoFocus />
            <Button variant="primary" type="submit" disabled={isSearching}>{isSearching ? "Finding ticket…" : "Find ticket"}</Button>
          </div>
          {error && <small role="alert">{error}</small>}
        </form>
      </section> : <section className="my-ticket-result">
        <div className="my-ticket-status"><TicketStatus status={displayedStatus} /><button type="button" onClick={reset}>Find another ticket</button></div>
        <TicketCard ref={ticketRef} ticket={ticket} />
        <div className="my-ticket-actions">
          <Button variant="primary" type="button" onClick={() => downloadTicketSvg(ticket, ticketRef.current?.querySelector(".ticket-qr-canvas svg"))}>Download ticket</Button>
          <Button type="button" onClick={() => window.print()}>Print ticket</Button>
        </div>
      </section>}
    </main>
  );
}

export default MyTickets;
