import { useMemo, useState } from "react";
import EventCard from "../../components/events/EventCard";
import Button from "../../components/ui/Button";
import { events } from "../../data/events";
import { saveEventToCalendar } from "../../utils/calendar";
import "./Home.css";

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;

function Home() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All events");
  const featured = events.find((event) => event.featured);
  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      if (event.featured) return false;
      const matchesSearch = !term || [event.title, event.venue, event.area, event.category].some((value) => value.toLowerCase().includes(term));
      const matchesFilter = activeFilter === "All events" ||
        (activeFilter === "Free" ? event.priceFrom === 0 : event.category === activeFilter) ||
        (activeFilter === "This weekend" && event.weekend);
      return matchesSearch && matchesFilter;
    });
  }, [query, activeFilter]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-media" src={featured.image} alt="A guest wearing an ornate mask at an evening celebration" />
        <div className="hero-scrim" />
        <div className="hero-content">
          <p className="kicker"><span />{featured.eyebrow}</p>
          <h1 id="hero-title">{featured.title}</h1>
          <p className="hero-copy">{featured.description}</p>
          <div className="hero-meta">
            <span>15 AUG</span><i /> <span>7PM—LATE</span><i /> <span>Thika</span>
          </div>
          <div className="hero-actions">
            <Button variant="primary" to={`/event/${featured.id}`}>Get tickets <Arrow /></Button>
            <Button className="hero-save-button" onClick={() => saveEventToCalendar(featured)}>+ Save event</Button>
          </div>
        </div>
        <div className="hero-count" aria-hidden="true"><b>01</b><span /><small>06</small></div>
      </section>

      <section className="discover" id="discover">
        <div className="section-intro">
          <p className="section-label">Nairobi, this is your night</p>
          <h2>Find your next<br /><em>good story.</em></h2>
        </div>
        <label className="search-box">
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, artists or venues" />
          <span>⌘ K</span>
        </label>
        <div className="filter-row" aria-label="Event categories">
          {["All events", "This weekend", "Live music", "Party", "Culture", "Free"].map((filter) => (
            <button className={filter === activeFilter ? "active" : ""} key={filter} onClick={() => setActiveFilter(filter)}>{filter}</button>
          ))}
        </div>
      </section>

      <section className="events-section" id="popular">
        <div className="section-heading">
          <div><span className="eyebrow-number">01</span><h2>Popular in Nairobi</h2></div>
          <a href="#all-events">See all <Arrow /></a>
        </div>
        <div className="event-grid" id="all-events">
          {filteredEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}
        </div>
        {filteredEvents.length === 0 && <p className="empty-state">No events match “{query}” yet. Try another Nairobi mood.</p>}
      </section>

      <section className="weekend-callout" id="weekend">
        <div>
          <p className="section-label">The TickoMag edit</p>
          <h2>Don’t just go out.<br /><em>Go somewhere.</em></h2>
        </div>
        <p>Hand-picked music, art, food and after-dark experiences worth leaving the group chat for.</p>
        <a className="round-link" href="#popular" aria-label="Explore the TickoMag edit"><Arrow /></a>
      </section>

    </main>
  );
}

export default Home;
