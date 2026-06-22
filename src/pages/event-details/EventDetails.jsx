import { useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { events } from "../../data/events";
import Button from "../../components/ui/Button";
import { saveEventToCalendar } from "../../utils/calendar";
import "./EventDetails.css";

const Icon = ({ name }) => {
  const paths = {
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const event = events.find((item) => item.id === id);
  const ticketOptions = useMemo(() => event?.tickets || [{ id: "general", name: "General admission", price: event?.priceFrom || 0, availability: "sold out" }], [event]);
  const firstAvailable = ticketOptions.find((ticket) => ticket.availability?.toLowerCase() !== "sold out");
  const [selectedId, setSelectedId] = useState(firstAvailable?.id || "");
  const [quantity, setQuantity] = useState(1);

  if (!event) {
    return <main className="details-page details-not-found"><p>Event not found.</p><Link to="/">Return home</Link></main>;
  }

  const selectedTicket = ticketOptions.find((ticket) => ticket.id === selectedId);
  const total = (selectedTicket?.price || 0) * quantity;
  const date = new Date(event.date);
  const fullDate = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" }).format(date);
  const money = (value) => `KSh ${value.toLocaleString("en-KE")}`;

  const selectTicket = (ticket) => {
    if (ticket.availability?.toLowerCase() === "sold out") return;
    setSelectedId(ticket.id);
    setQuantity(1);
  };

  const quickBuy = () => navigate("/checkout", { state: { event, ticket: selectedTicket, quantity, total } });

  return (
    <main className="details-page">
      <section className="details-hero">
        <img src={event.image} alt={`${event.title} event`} />
        <div className="details-hero-shade" />
        <Link className="details-back" to="/">← All events</Link>
        <div className="details-hero-copy">
          <span>{event.category}</span>
          <h1>{event.title}</h1>
        </div>
      </section>

      <div className="details-shell">
        <div className="details-content">
          <section className="event-intro">
            <p className="details-eyebrow">Event details</p>
            <div className="event-intro-heading">
              <h2>One night.<br />Remember everything.</h2>
              <Button className="calendar-button" onClick={() => saveEventToCalendar(event)}><Icon name="calendar" />Save to calendar</Button>
            </div>
            <p className="event-description">{event.description || `Join us for ${event.title}, a carefully selected TickoMag experience in ${event.area}.`}</p>
            <div className="event-facts">
              <div><Icon name="calendar" /><span><small>Date</small>{fullDate}</span></div>
              <div><Icon name="clock" /><span><small>Time</small>{time}{event.endTime ? ` — ${event.endTime}` : ""}</span></div>
              <div><Icon name="location" /><span><small>Venue</small>{event.venue}</span></div>
            </div>
          </section>

          <section className="ticket-section">
            <div className="ticket-heading"><div><p className="details-eyebrow">Tickets</p><h2>Choose your entry</h2></div><span>Prices in KES</span></div>
            <div className="ticket-list">
              {ticketOptions.map((ticket) => {
                const soldOut = ticket.availability?.toLowerCase() === "sold out";
                const selected = ticket.id === selectedId;
                return (
                  <button key={ticket.id} className={`ticket-option${selected ? " selected" : ""}${soldOut ? " sold-out" : ""}`} disabled={soldOut} onClick={() => selectTicket(ticket)}>
                    <span className="ticket-radio" />
                    <span className="ticket-name"><strong>{ticket.name}</strong><small>{soldOut ? "No longer available" : "Instant confirmation"}</small></span>
                    <span className={`availability ${soldOut ? "unavailable" : ""}`}>{soldOut ? "Sold out" : "Available"}</span>
                    <strong className="ticket-price">{money(ticket.price)}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="order-summary">
          <p className="details-eyebrow">Your order</p>
          <h2>Order summary</h2>
          <div className="summary-event"><img src={event.image} alt="" /><div><strong>{event.title}</strong><span>{fullDate}</span></div></div>
          <div className="summary-row"><span>Ticket</span><strong>{selectedTicket?.name || "Select a ticket"}</strong></div>
          <div className="summary-row quantity-row">
            <span>Quantity</span>
            <div className="quantity-selector"><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><strong>{quantity}</strong><button aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(10, value + 1))}>+</button></div>
          </div>
          <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
          <Button className="quick-buy" variant="primary" disabled={!selectedTicket} onClick={quickBuy}>Quick buy <Icon name="arrow" /></Button>
          <Button className="summary-calendar" onClick={() => saveEventToCalendar(event)}><Icon name="calendar" />Save to calendar</Button>
          <p className="summary-note">Secure checkout · Instant confirmation</p>
        </aside>
      </div>
    </main>
  );
}

export default EventDetails;
