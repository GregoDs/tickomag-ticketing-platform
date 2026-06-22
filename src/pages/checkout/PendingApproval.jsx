import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../../components/ui/Button";
import Confetti from "../../components/ui/Confetti";
import {
  getTicketRequestByPayment,
  subscribeToTicketRequestByPayment,
} from "../../services/orders.service";
import "./PendingApproval.css";

const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;
const validCode = (code) => /^[A-Z0-9]{8,12}$/.test(code);

const normalizeStatus = (status = "submitted") => {
  const normalized = status.toLowerCase().replaceAll(" ", "_");
  if (["approved", "ticket_issued", "issued"].includes(normalized)) return "approved";
  if (["pending", "pending_approval", "pending_verification"].includes(normalized)) return "pending";
  if (["rejected", "declined"].includes(normalized)) return "rejected";
  return "submitted";
};

const statusCopy = {
  submitted: {
    eyebrow: "Request received",
    title: "Your details are in.",
    message: "Your payment details were submitted and are being prepared for review.",
  },
  pending: {
    eyebrow: "Payment under review",
    title: "Hold tight. We’re checking it.",
    message: "Your payment is waiting for approval. Return here later with your M-Pesa code to see the latest status.",
  },
  approved: {
    eyebrow: "Payment approved",
    title: "You’re on the list.",
    message: "Your payment has been confirmed and your scannable ticket has been issued.",
  },
  rejected: {
    eyebrow: "Action required",
    title: "We couldn’t approve it.",
    message: "The payment could not be verified. Confirm the submitted details or contact the event team for help.",
  },
};

function StatusTracker({ status }) {
  const activeIndex = status === "approved" ? 2 : status === "pending" ? 1 : 0;
  const steps = ["Submitted", "Pending approval", "Approved"];

  return (
    <div className="approval-tracker" aria-label={`Ticket request status: ${status}`}>
      <div className={`tracker-progress tracker-progress--${activeIndex}`} />
      {steps.map((step, index) => (
        <div key={step} className={`tracker-step${index < activeIndex ? " is-complete" : ""}${index === activeIndex ? " is-current" : ""}`}>
          <span>{index < activeIndex ? "✓" : index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

function PendingApproval() {
  const { state } = useLocation();
  const [initialCode] = useState(() => state?.mpesaCode || window.localStorage.getItem("tickomag:lastMpesaCode") || "");
  const [initialPhone] = useState(() => state?.order?.phone || window.localStorage.getItem("tickomag:lastPaymentPhone") || "");
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState(initialPhone);
  const [request, setRequest] = useState(state?.order ? { id: state.requestId, ...state.order, approvalStatus: "pending" } : null);
  const [isChecking, setIsChecking] = useState(Boolean(initialCode && initialPhone));
  const [lookupError, setLookupError] = useState("");

  const lookup = async (mpesaCode, paymentPhone) => {
    const normalizedCode = mpesaCode.trim().toUpperCase();
    if (!validCode(normalizedCode) || paymentPhone.replace(/\D/g, "").length < 9) {
      setLookupError("Enter a valid M-Pesa code and the phone number submitted with it.");
      return;
    }

    setIsChecking(true);
    setLookupError("");
    try {
      const result = await getTicketRequestByPayment(normalizedCode, paymentPhone);
      if (!result) {
        setRequest(null);
        setLookupError("No request matches that M-Pesa code and phone number.");
        return;
      }
      setRequest(result);
      setCode(normalizedCode);
      setPhone(paymentPhone);
      window.localStorage.setItem("tickomag:lastMpesaCode", normalizedCode);
      window.localStorage.setItem("tickomag:lastPaymentPhone", paymentPhone);
    } catch (error) {
      console.error("Ticket status lookup failed:", error);
      setLookupError("We could not check the status. Check your connection and try again.");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!initialCode || !initialPhone) return undefined;

    let cancelled = false;
    let unsubscribe;
    subscribeToTicketRequestByPayment(initialCode, initialPhone, (result) => {
      if (cancelled) return;
      setRequest(result);
      setLookupError(result ? "" : "No request matches that M-Pesa code and phone number.");
      setIsChecking(false);
      if (result) {
        window.localStorage.setItem("tickomag:lastMpesaCode", initialCode);
        window.localStorage.setItem("tickomag:lastPaymentPhone", initialPhone);
      }
    }, (error) => {
      if (cancelled) return;
      console.error("Live ticket status failed:", error);
      setLookupError("We could not monitor the status. Use Refresh status to try again.");
      setIsChecking(false);
    })
      .then((stopListening) => {
        if (cancelled) stopListening();
        else unsubscribe = stopListening;
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Ticket status listener setup failed:", error);
        setLookupError("We could not check the status. Check your connection and try again.");
        setIsChecking(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [initialCode, initialPhone]);

  const submitLookup = (event) => {
    event.preventDefault();
    lookup(code, phone);
  };

  const status = normalizeStatus(request?.approvalStatus || request?.requestStatus);
  const copy = statusCopy[status];
  const attendee = request?.attendee || request;
  const eventDetails = request?.event || {};
  const ticket = request?.ticket || {};
  const eventTitle = request?.eventTitle || eventDetails.title;
  const ticketType = request?.ticketType || ticket.name;
  const transactionCode = request?.mpesaCode || request?.payment?.transactionCode;

  return (
    <main className="approval-page">
      {status === "approved" && <Confetti />}
      <section className="approval-hero">
        <Link to="/">← Back to events</Link>
        <p>{request ? copy.eyebrow : "Ticket status"}</p>
        <h1>{request ? copy.title : <>Find your<br /><em>ticket request.</em></>}</h1>
        <span>{request ? copy.message : "Use the M-Pesa transaction code and phone number submitted with the payment to retrieve your request."}</span>
      </section>

      <div className="approval-shell">
        <section className="approval-main-card">
          {request ? (
            <>
              {status === "rejected" ? <div className="approval-alert">Payment verification needs your attention.</div> : <StatusTracker status={status} />}

              <div className="approval-reference">
                <span>M-Pesa reference</span>
                <strong>{transactionCode}</strong>
                <small>Keep this code. You will use it to check your status later.</small>
              </div>

              {status === "approved" && (
                <div className="approval-success-action">
                  <div><span>Payment confirmed</span><h2>Your ticket is ready.</h2><p>Open it now and keep the QR code ready for the gate scanner.</p></div>
                  {request.issuedTicket ? <Button variant="primary" to="/ticket" state={{ mpesaCode: code, phone }}>Open ticket <b>→</b></Button> : <p className="ticket-message">This older approval has no retrievable ticket payload. Ask an admin to reissue it.</p>}
                </div>
              )}

              <button className="check-another" type="button" onClick={() => { setRequest(null); setCode(""); setPhone(""); setLookupError(""); }}>Check different details</button>
            </>
          ) : (
            <div className="lookup-intro">
              <span>01 / 01</span>
              <h2>Retrieve your request</h2>
              <p>Use the transaction code from M-Pesa and the same phone number entered during checkout.</p>
            </div>
          )}

          <form className={`status-lookup${request ? " status-lookup--compact" : ""}`} onSubmit={submitLookup} noValidate>
            <div className="status-lookup-labels"><label htmlFor="status-code">M-Pesa transaction code</label><label htmlFor="status-phone">Phone number</label></div>
            <div><input id="status-code" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setLookupError(""); }} placeholder="e.g. QH12ABC345" maxLength="12" autoComplete="off" /><input id="status-phone" type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setLookupError(""); }} placeholder="e.g. 0712 345 678" autoComplete="tel" /><Button variant="primary" type="submit" disabled={isChecking}>{isChecking ? "Checking…" : request ? "Refresh status" : "Check status"}</Button></div>
            {lookupError && <small role="alert">{lookupError}</small>}
          </form>
        </section>

        {request && (
          <aside className="approval-summary">
            <p>Request details</p>
            <dl>
              <div><dt>Name</dt><dd>{attendee.firstName} {attendee.lastName}</dd></div>
              <div><dt>Email</dt><dd>{attendee.email}</dd></div>
              <div><dt>Phone</dt><dd>{attendee.phone}</dd></div>
              <div><dt>Event</dt><dd>{eventTitle}</dd></div>
              <div><dt>Ticket</dt><dd>{ticketType} × {request.quantity || ticket.quantity}</dd></div>
              <div><dt>Total</dt><dd>{money(request.total)}</dd></div>
            </dl>
            <small>Approval is completed by the event team after confirming your M-Pesa payment.</small>
          </aside>
        )}
      </div>
    </main>
  );
}

export default PendingApproval;
