import { useCallback, useEffect, useRef, useState } from "react";
import { getEvents } from "../../services/events.service";
import "./SiteIntro.css";

const INTRO_SESSION_KEY = "tickomag:intro-seen";
const INTRO_MINIMUM_MS = 2100;
const INTRO_MAXIMUM_MS = 4200;
const EXIT_DURATION_MS = 850;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function preloadImage(source) {
  if (!source) return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    const finish = () => resolve();
    image.onload = finish;
    image.onerror = finish;
    image.src = source;
    if (image.complete) finish();
  });
}

function shouldPlayIntro() {
  if (window.location.pathname.startsWith("/admin")) return false;

  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) !== "true";
  } catch {
    return true;
  }
}

function rememberIntro() {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    // The intro still works when storage is unavailable.
  }
}

function SiteIntro() {
  const [visible, setVisible] = useState(shouldPlayIntro);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);
  const exitTimerRef = useRef();
  const reducedMotionRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    rememberIntro();

    if (reducedMotionRef.current) {
      document.documentElement.classList.remove("site-intro-active");
      setVisible(false);
      return;
    }

    setExiting(true);
    exitTimerRef.current = window.setTimeout(
      () => setVisible(false),
      EXIT_DURATION_MS
    );
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    document.documentElement.classList.add("site-intro-active");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    reducedMotionRef.current = reducedMotion;
    let cancelled = false;

    const catalogReady = getEvents()
      .then((events) => preloadImage(
        events.find((event) => event.id === "masquerade-2026")?.image ||
          events[0]?.image
      ))
      .catch(() => undefined);
    const minimumTime = wait(reducedMotion ? 100 : INTRO_MINIMUM_MS);
    const maximumTime = wait(reducedMotion ? 800 : INTRO_MAXIMUM_MS);

    Promise.race([
      Promise.all([catalogReady, minimumTime]),
      maximumTime,
    ]).then(() => {
      if (!cancelled) finish();
    });

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("site-intro-active");
      window.clearTimeout(exitTimerRef.current);
    };
  }, [finish, visible]);

  useEffect(() => {
    if (!visible || !exiting) return undefined;
    const timer = window.setTimeout(() => {
      document.documentElement.classList.remove("site-intro-active");
    }, EXIT_DURATION_MS - 100);
    return () => window.clearTimeout(timer);
  }, [exiting, visible]);

  if (!visible) return null;

  return (
    <div
      className={`site-intro${exiting ? " site-intro--exiting" : ""}`}
      aria-label="Opening TickoMag"
    >
      <div className="site-intro-grid" aria-hidden="true" />

      <header className="site-intro-header">
        <span>Nairobi / KE</span>
        <span>Events worth showing up for</span>
        <span>Est. 2026</span>
      </header>

      <div className="site-intro-wordmark" aria-label="TickoMag">
        <div className="site-intro-word site-intro-word--ticko" aria-hidden="true">
          {["T", "I", "C", "K", "O"].map((letter, index) => (
            <span key={letter} style={{ "--intro-letter": index }}>
              <i>{letter}</i>
            </span>
          ))}
        </div>
        <div className="site-intro-word site-intro-word--mag" aria-hidden="true">
          <span style={{ "--intro-letter": 5 }}><i>MAG</i></span>
          <b>.</b>
        </div>
      </div>

      <div className="site-intro-orbit" aria-hidden="true">
        <span>01</span>
        <i />
        <span>Tonight starts here</span>
      </div>

      <footer className="site-intro-footer">
        <div className="site-intro-status" role="status" aria-live="polite">
          <span>Finding your next night</span>
          <span>Setting the scene</span>
          <span>Doors are opening</span>
        </div>
        <button type="button" onClick={finish}>Skip intro</button>
        <div className="site-intro-progress" aria-hidden="true">
          <i />
        </div>
      </footer>

      <div className="site-intro-reveal" aria-hidden="true" />
    </div>
  );
}

export default SiteIntro;
