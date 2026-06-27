import { useEffect, useMemo, useRef, useState } from "react";
import EventCard from "../../components/events/EventCard";
import Button from "../../components/ui/Button";
import { getEvents } from "../../services/events.service";
import { saveEventToCalendar } from "../../utils/calendar";
import "./Home.css";

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
const HERO_EVENT_IDS = ["masquerade-2026", "fashion-mku-2026", "sunset-frequency"];

function Home() {
  const [events, setEvents] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All events");
  const [heroIndex, setHeroIndex] = useState(0);
  const touchStartRef = useRef(null);
  const heroEvents = useMemo(() => HERO_EVENT_IDS
    .map((eventId) => events.find((event) => event.id === eventId))
    .filter(Boolean), [events]);
  const featured = heroEvents[heroIndex] || heroEvents[0];
  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !term || [event.title, event.venue, event.area, event.category].some((value) => String(value || "").toLowerCase().includes(term));
      const matchesFilter = activeFilter === "All events" ||
        (activeFilter === "Free" ? event.priceFrom === 0 : event.category === activeFilter) ||
        (activeFilter === "This weekend" && event.weekend);
      return matchesSearch && matchesFilter;
    });
  }, [events, query, activeFilter]);

  useEffect(() => {
    let active = true;
    getEvents().then((catalog) => {
      if (!active) return;
      setEvents(catalog);
      setCatalogError("");
    }).catch((error) => {
      if (!active) return;
      console.error("Event catalog failed:", error);
      setCatalogError(error.message || "Events could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (heroEvents.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroEvents.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroEvents.length]);

  if (loading) return <main className="home-catalog-state"><p>Loading events…</p></main>;
  if (!featured) return <main className="home-catalog-state"><p>{catalogError || "No published events are available."}</p></main>;

  const featuredDate = new Date(featured.date);
  const heroDate = new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short" }).format(featuredDate).toUpperCase();
  const heroTime = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" }).format(featuredDate);
  const moveHero = (direction) => setHeroIndex((current) =>
    (current + direction + heroEvents.length) % heroEvents.length
  );
  const finishSwipe = (event) => {
    const start = touchStartRef.current;
    if (start === null) return;
    const distance = event.changedTouches[0].clientX - start;
    if (Math.abs(distance) > 45) moveHero(distance < 0 ? 1 : -1);
    touchStartRef.current = null;
  };

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title" onTouchStart={(event) => { touchStartRef.current = event.touches[0].clientX; }} onTouchEnd={finishSwipe}>
        <img key={featured.id} className="hero-media" src={featured.image} alt={`${featured.title} event`} />
        <div className="hero-scrim" />
        <div key={`copy-${featured.id}`} className="hero-content">
          <p className="kicker"><span />{featured.eyebrow || featured.category}</p>
          <h1 id="hero-title">{featured.title}</h1>
          <p className="hero-copy">{featured.description}</p>
          <div className="hero-meta">
            <span>{heroDate}</span><i /> <span>{heroTime}{featured.endTime ? `—${featured.endTime}` : ""}</span><i /> <span>{featured.area}</span>
          </div>
          <div className="hero-actions">
            <Button variant="primary" to={`/event/${featured.id}`}>Get tickets <Arrow /></Button>
            <Button className="hero-save-button" onClick={() => saveEventToCalendar(featured)}>+ Save event</Button>
          </div>
        </div>
        {heroEvents.length > 1 && <div className="hero-carousel-controls" aria-label="Featured events">
          <button type="button" onClick={() => moveHero(-1)} aria-label="Previous featured event">←</button>
          <div>{heroEvents.map((event, index) => <button key={event.id} className={index === heroIndex ? "active" : ""} type="button" onClick={() => setHeroIndex(index)} aria-label={`Show ${event.title}`} />)}</div>
          <button type="button" onClick={() => moveHero(1)} aria-label="Next featured event">→</button>
        </div>}
        <div className="hero-count" aria-hidden="true"><b>{String(heroIndex + 1).padStart(2, "0")}</b><span /><small>{String(heroEvents.length).padStart(2, "0")}</small></div>
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
