import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { createTicketRequest } from "../../services/orders.service";
import "./PaymentVerification.css";

const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;

function PaymentVerification() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [transactionCode, setTransactionCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);
  const transactionInputRef = useRef(null);

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  if (!state?.event || !state?.ticket || !state?.attendee) {
    return <main className="verification-page verification-empty"><p>Payment details are missing.</p><Button variant="primary" to="/">Browse events</Button></main>;
  }

  const { event, ticket, quantity, total, attendee, payment } = state;

  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (submissionLockRef.current) return;
    const code = transactionCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,12}$/.test(code)) {
      setError("Enter a valid M-Pesa transaction code");
      transactionInputRef.current?.focus({ preventScroll: true });
      transactionInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const order = {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        phone: attendee.phone,
        attendee: {
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          phone: attendee.phone,
        },
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date || "",
        eventVenue: event.venue || "",
        eventImage: event.image || "",
        event: {
          id: event.id,
          title: event.title,
          description: event.description || "",
          date: event.date || "",
          endTime: event.endTime || "",
          venue: event.venue || "",
          area: event.area || "",
          category: event.category || "",
          image: event.image || "",
          featured: Boolean(event.featured),
          weekend: Boolean(event.weekend),
        },
        ticketId: ticket.id,
        ticketType: ticket.name,
        unitPrice: Number(ticket.price),
        quantity: Number(quantity),
        total: Number(total),
        ticket: {
          id: ticket.id,
          name: ticket.name,
          unitPrice: Number(ticket.price),
          quantity: Number(quantity),
          availability: ticket.availability || "",
        },
        mpesaCode: code,
        accountNumber: payment?.accountNumber || attendee.phone,
        tillNumber: payment?.tillNumber || "123456",
        payment: {
          method: "M-Pesa",
          transactionCode: code,
          accountNumber: payment?.accountNumber || attendee.phone,
          tillNumber: payment?.tillNumber || "123456",
          status: "pending_verification",
        },
      };

      const { requestId, orderId } = await createTicketRequest(order);
      const savedOrder = { ...order, requestId, orderId };
      window.localStorage.setItem("tickomag:lastMpesaCode", code);
      window.localStorage.setItem("tickomag:lastPaymentPhone", attendee.phone);
      navigate("/pending-approval", {
        replace: true,
        state: { requestId, mpesaCode: code, order: savedOrder },
      });
    } catch (submissionError) {
      console.error("Ticket request submission failed:", submissionError);
      setError(submissionError.code === "duplicate-payment"
        ? "This M-Pesa code has already been submitted. Check its status instead."
        : "We could not submit your request. Check your connection and try again.");
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
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
          <label>Transaction Code<input ref={transactionInputRef} value={transactionCode} onChange={(e) => { setTransactionCode(e.target.value.toUpperCase()); setError(""); }} placeholder="e.g. QH12ABC345" maxLength="12" autoComplete="off" aria-invalid={Boolean(error)} autoFocus />{error && <small>{error}</small>}</label>
          <Button className="verification-submit" variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit for verification"}<span>→</span></Button>
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
