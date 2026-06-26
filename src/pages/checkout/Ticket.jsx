import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../../components/ui/Button";
import TicketCard from "../../components/tickets/TicketCard";
import TicketStatus from "../../components/tickets/TicketStatus";
import { retrieveIssuedTicket } from "../../services/tickets.service";
import { downloadTicketSvg } from "../../utils/downloadTicket";
import "./Ticket.css";

function Ticket() {
  const { state } = useLocation();
  const [credentials] = useState(() => ({
    mpesaCode: state?.mpesaCode || window.localStorage.getItem("tickomag:lastMpesaCode") || "",
    phone: state?.phone || window.localStorage.getItem("tickomag:lastPaymentPhone") || "",
  }));
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const ticketRef = useRef(null);

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  useEffect(() => {
    if (!credentials.mpesaCode || !credentials.phone) return undefined;
    let cancelled = false;

    retrieveIssuedTicket(credentials.mpesaCode, credentials.phone)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setStatus("missing");
          return;
        }
        setStatus(result.status);
        setTicket(result.ticket);
      })
      .catch((retrievalError) => {
        if (cancelled) return;
        console.error("Issued ticket retrieval failed:", retrievalError);
        setError("Your ticket could not be loaded. Check your connection and try again.");
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [credentials]);

  if (!credentials.mpesaCode || !credentials.phone || status === "missing") {
    return <main className="ticket-page ticket-page-state"><p>Retrieve your approved request before opening a ticket.</p><Button variant="primary" to="/pending-approval">Find my ticket</Button></main>;
  }

  if (status === "loading") {
    return <main className="ticket-page ticket-page-state"><p>Preparing your ticket…</p></main>;
  }

  if (error) {
    return <main className="ticket-page ticket-page-state"><p>{error}</p><Button variant="primary" to="/pending-approval">Return to status</Button></main>;
  }

  if (!ticket) {
    return <main className="ticket-page ticket-page-state"><p>This request is currently {status}. Your ticket will appear after approval.</p><Button variant="primary" to="/pending-approval">Check status</Button></main>;
  }

  return (
    <main className="ticket-page">
      <section className="ticket-page-hero">
        <Link to="/pending-approval">← Back to ticket status</Link>
        <p>Payment approved</p>
        <h1>Your ticket<br /><em>is ready.</em></h1>
        <div><TicketStatus status={ticket.scanStatus} /><span>Keep this page available at the entrance. Screenshots and printed copies are accepted if the QR remains clear.</span></div>
      </section>

      <section className="ticket-page-shell">
        <TicketCard ref={ticketRef} ticket={ticket} />
        <div className="ticket-page-actions">
          <Button variant="primary" onClick={() => downloadTicketSvg(ticket, ticketRef.current?.querySelector(".ticket-qr-canvas svg"))}>Download ticket</Button>
          <Button onClick={() => window.print()}>Print ticket</Button>
          <Link to="/">Browse more events →</Link>
        </div>
      </section>
    </main>
  );
}

export default Ticket;
