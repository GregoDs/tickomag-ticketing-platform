import { useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import "./PaymentVerification.css";

const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;

function PaymentVerification() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [transactionCode, setTransactionCode] = useState("");
  const [error, setError] = useState("");

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  if (!state?.event || !state?.ticket || !state?.attendee) {
    return <main className="verification-page verification-empty"><p>Payment details are missing.</p><Button variant="primary" to="/">Browse events</Button></main>;
  }

  const { event, ticket, quantity, total, attendee, payment } = state;

  const submit = (submitEvent) => {
    submitEvent.preventDefault();
    const code = transactionCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,12}$/.test(code)) {
      setError("Enter a valid M-Pesa transaction code");
      return;
    }

    navigate("/pending-approval", {
      state: {
        event,
        ticket,
        quantity,
        total,
        attendee,
        payment: { ...payment, transactionCode: code, status: "pending" },
      },
    });
  };

  return (
    <main className="verification-page">
      <section className="verification-hero">
        <Link to="/checkout" state={state}>← Back to checkout</Link>
        <p>Final step</p>
        <h1>Verify your<br /><em>payment.</em></h1>
        <span>Enter the transaction code from your M-Pesa confirmation message.</span>
      </section>

      <div className="verification-shell">
        <form className="verification-card" onSubmit={submit} noValidate>
          <span className="verification-number">01 / 01</span>
          <h2>M-Pesa transaction</h2>
          <p>Payment for <strong>{event.title}</strong> from the phone number ending in <strong>{attendee.phone.slice(-4)}</strong>.</p>
          <div className="verification-payment"><span>Amount paid</span><strong>{money(total)}</strong></div>
          <label>Transaction Code<input value={transactionCode} onChange={(e) => { setTransactionCode(e.target.value.toUpperCase()); setError(""); }} placeholder="e.g. QH12ABC345" maxLength="12" autoComplete="off" aria-invalid={Boolean(error)} autoFocus />{error && <small>{error}</small>}</label>
          <Button className="verification-submit" variant="primary" type="submit">Submit for verification <span>→</span></Button>
          <small className="verification-note">Your ticket will be issued after payment approval.</small>
        </form>

        <aside className="verification-summary">
          <p>Verification details</p>
          <dl>
            <div><dt>Attendee</dt><dd>{attendee.firstName} {attendee.lastName}</dd></div>
            <div><dt>Email</dt><dd>{attendee.email}</dd></div>
            <div><dt>Phone</dt><dd>{attendee.phone}</dd></div>
            <div><dt>Event</dt><dd>{event.title}</dd></div>
            <div><dt>Ticket</dt><dd>{ticket.name} × {quantity}</dd></div>
            <div><dt>Till number</dt><dd>{payment?.tillNumber || "123456"}</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

export default PaymentVerification;
