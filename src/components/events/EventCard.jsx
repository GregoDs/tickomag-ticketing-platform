import { Link } from "react-router-dom";
import Card from "../ui/Card";
import { saveEventToCalendar } from "../../utils/calendar";

const dateParts = (value) => {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("en-KE", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-KE", { month: "short" }).format(date).toUpperCase(),
    weekday: new Intl.DateTimeFormat("en-KE", { weekday: "short" }).format(date).toUpperCase(),
  };
};

function EventCard({ event, index }) {
  const date = dateParts(event.date);
  return (
    <Card className="event-card" style={{ "--card-index": index }}>
      <div className="event-image-wrap">
        <Link className="event-image-link" to={`/event/${event.id}`} aria-label={`View ${event.title}`}>
          <img className="event-image" src={event.image} alt="" loading="lazy" />
        </Link>
        <span className="event-category">{event.category}</span>
        <button className="save-button" aria-label={`Save ${event.title} to calendar`} onClick={() => saveEventToCalendar(event)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17L12 17l-5.5 3.5z"/></svg>
        </button>
      </div>
      <div className="event-card-body">
        <div className="event-date"><small>{date.weekday}</small><strong>{date.day}</strong><small>{date.month}</small></div>
        <div>
          <h3><Link to={`/event/${event.id}`}>{event.title}</Link></h3>
          <p>{event.venue}</p>
          <p className="event-price">{event.priceFrom === 0 ? "Free entry" : `From KSh ${event.priceFrom.toLocaleString()}`}</p>
        </div>
      </div>
    </Card>
  );
}

export default EventCard;
