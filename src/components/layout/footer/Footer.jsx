import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <Link className="wordmark" to="/">ticko<span>mag</span><i>.</i></Link>
      <p>Made for Nairobi nights.</p>
      <small>© 2026 gregorykago arts</small>
    </footer>
  );
}

export default Footer;
