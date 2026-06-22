import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Icon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.5-5 2.8-7.5 7-7.5s6.5 2.5 7 7.5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h10"/></>,
    close: <><path d="m5 5 14 14M19 5 5 19"/></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-header${scrolled || menuOpen ? " site-header--solid" : ""}`}>
        <Link className="wordmark" to="/" aria-label="TickoMag home" onClick={closeMenu}>
          ticko<span>mag</span><i>.</i>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link to="/#discover">Discover</Link>
          <Link to="/#popular">Popular</Link>
          <Link to="/#weekend">This weekend</Link>
        </nav>
        <div className="nav-actions">
          <button className="icon-button desktop-only" aria-label="Search"><Icon name="search" /></button>
          <Link className="account-button" to=""><Icon name="user" /><span></span></Link>
          <button
            className="icon-button mobile-only menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>

      <div id="mobile-menu" className={`mobile-menu${menuOpen ? " mobile-menu--open" : ""}`} aria-hidden={!menuOpen}>
        <nav aria-label="Mobile navigation">
          <Link to="/#discover" onClick={closeMenu}><small>01</small>Discover</Link>
          <Link to="/#popular" onClick={closeMenu}><small>02</small>Events</Link>
          <Link to="/#weekend" onClick={closeMenu}><small>03</small>This weekend</Link>
          <Link to="/pending-approval" onClick={closeMenu}><small>04</small>My tickets</Link>
        </nav>
        <div className="mobile-menu-footer">
          <span>Nairobi, KE</span>
          <span>Events worth showing up for.</span>
        </div>
        <div className="mobile-menu-marquee" aria-hidden="true">TICKOMAG</div>
      </div>
    </>
  );
}

export default Navbar;
