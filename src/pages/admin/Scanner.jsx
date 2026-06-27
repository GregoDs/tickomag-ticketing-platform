import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyTicket } from "../../services/scanner.service";
import "./Scanner.css";

const outcomeCopy = {
  valid: {
    eyebrow: "First scan",
    title: "Ticket accepted",
    admission: "Allow entry",
  },
  already_used: {
    eyebrow: "Repeat scan",
    title: "Ticket already used",
    admission: "Do not admit",
  },
  inactive: {
    eyebrow: "Entry blocked",
    title: "Ticket inactive",
    admission: "Do not admit",
  },
  invalid: {
    eyebrow: "Verification failed",
    title: "Invalid ticket",
    admission: "Do not admit",
  },
  error: {
    eyebrow: "Connection error",
    title: "Could not verify ticket",
    admission: "Try again",
  },
};

const formatTime = (value) => value ? new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "medium",
}).format(new Date(value)) : "Not recorded";

function cameraErrorMessage(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (!window.isSecureContext) return "Camera access requires an HTTPS address.";
  if (message.includes("permission") || message.includes("notallowed")) {
    return "Camera permission was denied. Allow camera access in the browser settings and try again.";
  }
  if (message.includes("notfound") || message.includes("requested device not found")) {
    return "No usable camera was found on this device.";
  }
  return "The camera could not start. Check its browser permission and try again.";
}

function Scanner() {
  const processingRef = useRef(false);
  const [session, setSession] = useState(0);
  const [phase, setPhase] = useState("starting");
  const [result, setResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [cameraError, setCameraError] = useState("");

  useLayoutEffect(() => {
    if (phase === "result" || phase === "camera_error") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [phase]);

  useEffect(() => {
    let disposed = false;
    const elementId = `ticket-qr-reader-${session}`;
    const scanner = new Html5Qrcode(elementId, { verbose: false });

    const stopScanner = async () => {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch (error) {
        console.warn("Camera cleanup failed:", error);
      }
    };

    const handleDecoded = async (payload) => {
      if (processingRef.current || disposed) return;

      processingRef.current = true;
      setPhase("verifying");
      navigator.vibrate?.(40);
      await stopScanner();

      try {
        const verification = await verifyTicket(payload.trim());
        if (disposed) return;
        setResult(verification);
        setRequestError("");
      } catch (error) {
        if (disposed) return;
        setResult(null);
        setRequestError(error.message || "The ticket could not be verified.");
      } finally {
        if (!disposed) setPhase("result");
      }
    };

    const startScanner = async () => {
      setPhase("starting");
      setCameraError("");

      //comment

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.floor(Math.min(width, height) * 0.72);
              return { width: size, height: size };
            },
          },
          handleDecoded,
          () => {}
        );

        if (disposed) {
          await stopScanner();
          return;
        }

        setPhase("scanning");
      } catch (error) {
        if (disposed) return;
        console.error("Camera start failed:", error);
        setCameraError(cameraErrorMessage(error));
        setPhase("camera_error");
      }
    };

    startScanner();

    return () => {
      disposed = true;
      processingRef.current = false;
      stopScanner();
    };
  }, [session]);

  const scanAgain = () => {
    processingRef.current = false;
    setResult(null);
    setRequestError("");
    setCameraError("");
    setPhase("starting");
    setSession((current) => current + 1);
  };

  const outcome = requestError ? "error" : result?.outcome;
  const copy = outcomeCopy[outcome] || outcomeCopy.invalid;
  const ticket = result?.ticket;
  const attendeeName = ticket
    ? `${ticket.attendee?.firstName || ""} ${ticket.attendee?.lastName || ""}`.trim()
    : "";

  if (phase === "result") {
    return (
      <main className={`scanner-page scanner-page--result scanner-outcome--${outcome}`}>
        <section className="scanner-result-view" aria-live="assertive">
          <header className="scanner-result-heading">
            <div className="scanner-result-mark" aria-hidden="true">{outcome === "valid" ? "✓" : "!"}</div>
            <p>{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <strong>{copy.admission}</strong>
            <span>{requestError || result?.message}</span>
          </header>

          {ticket && <dl className="scanner-ticket-details">
            <div><dt>Holder</dt><dd>{attendeeName || "Not provided"}</dd></div>
            <div><dt>Ticket status</dt><dd>{outcome === "valid" ? "Consumed on first scan" : ticket.status}</dd></div>
            <div><dt>Event</dt><dd>{ticket.event?.title || ticket.event?.name || "Event ticket"}</dd></div>
            <div><dt>Ticket</dt><dd>{ticket.ticket?.name || "Admission"} × {ticket.quantity}</dd></div>
            <div><dt>Ticket code</dt><dd>{ticket.ticketCode}</dd></div>
            <div><dt>First scanned</dt><dd>{formatTime(ticket.scannedAt)}</dd></div>
            <div><dt>Scanned by</dt><dd>{ticket.scannedBy?.name || ticket.scannedBy?.email || "Not recorded"}</dd></div>
            <div><dt>Scan attempts</dt><dd>{ticket.scanAttempts}</dd></div>
          </dl>}

          <button className="scanner-primary-action" type="button" onClick={scanAgain}>
            {outcome === "valid" ? "Scan next ticket" : "Scan again"}
          </button>
        </section>
      </main>
    );
  }

  if (phase === "camera_error") {
    return (
      <main className="scanner-page scanner-page--camera-error">
        <section className="scanner-camera-error" role="alert">
          <div className="scanner-result-mark" aria-hidden="true">!</div>
          <p>Camera unavailable</p>
          <h1>Scanner could not start</h1>
          <span>{cameraError}</span>
          <button className="scanner-primary-action" type="button" onClick={scanAgain}>Try camera again</button>
        </section>
      </main>
    );
  }

  return (
    <main className="scanner-page scanner-page--camera">
      <header className="scanner-header">
        <div><p>Gate control</p><h1>Scan ticket</h1></div>
        <span className="scanner-secure"><i />Live</span>
      </header>

      <section className={`scanner-camera-stage scanner-camera-stage--${phase}`} aria-label="Ticket QR scanner">
        <div id={`ticket-qr-reader-${session}`} className="scanner-camera-feed" />
        <div className="scanner-target" aria-hidden="true">
          {phase === "scanning" && <div className="scanner-laser" />}
        </div>

        {phase === "starting" && <div className="scanner-stage-status">
          <div className="scanner-spinner" />
          <strong>Starting camera</strong>
        </div>}

        {phase === "verifying" && <div className="scanner-stage-status scanner-stage-status--verifying">
          <div className="scanner-spinner" />
          <strong>Verifying ticket</strong>
          <span>Checking token and admission status</span>
        </div>}

        {phase === "scanning" && <div className="scanner-ready-label"><i />Ready to scan</div>}
      </section>
    </main>
  );
}

export default Scanner;
