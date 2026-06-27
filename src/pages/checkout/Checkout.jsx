import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { initiateMpesaPayment } from "../../services/mpesa.service";
import "./Checkout.css";

const initialForm = { firstName: "", lastName: "", email: "", phone: "" };
const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;

const normalizeMpesaPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
};

function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const formRef = useRef(null);

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  if (!state?.event || !state?.ticket) {
    return <main className="checkout-page checkout-empty"><p>Your checkout session is empty.</p><Button variant="primary" to="/">Browse events</Button></main>;
  }

  const { event, ticket, quantity, total } = state;

  const updateField = ({ target }) => {
    setForm((current) => ({ ...current, [target.name]: target.value }));
    setErrors((current) => ({ ...current, [target.name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    if (form.phone.replace(/\D/g, "").length < 9) next.phone = "Enter a valid phone number";
    setErrors(next);
    return Object.keys(next)[0];
  };

  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    const firstInvalidField = validate();
    if (firstInvalidField) {
      const input = formRef.current?.elements.namedItem(firstInvalidField);
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsPaying(true);
    setPaymentError("");

    const attendee = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    };

    const order = {
      phone: normalizeMpesaPhone(form.phone),
      attendee,
      eventId: event.id,
      ticketId: ticket.id,
      quantity: Number(quantity),
    };

    try {
      const response = await initiateMpesaPayment(order);
      const checkoutRequestID = response.data?.CheckoutRequestID;

      if (!checkoutRequestID) {
        throw new Error("The M-Pesa response did not include a checkout request ID.");
      }

      window.localStorage.setItem("tickomag:lastCheckoutRequestID", checkoutRequestID);
      navigate("/payment-success", {
        replace: true,
        state: {
          checkoutRequestID,
          order: {
            phone: order.phone,
            attendee,
            event,
            ticket,
            quantity: Number(quantity),
            total: Number(response.data?.quote?.total ?? total),
          },
        },
      });
    } catch (error) {
      console.error("M-Pesa payment initiation failed:", error);
      setPaymentError(error.message || "We could not start the M-Pesa payment. Try again.");
    } finally {
      setIsPaying(false);
    }
  };

  const focusPaymentAction = () => {
    setPaymentError("");
    const paymentButton = formRef.current?.querySelector(".checkout-submit");
    paymentButton?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => paymentButton?.focus({ preventScroll: true }), 350);
  };

  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <Link to={`/event/${event.id}`}>← Back to event</Link>
        <span>Secure checkout</span>
        <h1>Almost yours.</h1>
        <p>Your details stay attached to this ticket through payment verification.</p>
      </div>

      <div className="checkout-shell">
        <aside className="checkout-summary">
          <p className="checkout-kicker">Order summary</p>
          <img src={event.image} alt="" />
          <h2>{event.title}</h2>
          <span className="summary-venue">{event.venue}</span>
          <dl>
            <div><dt>Ticket type</dt><dd>{ticket.name}</dd></div>
            <div><dt>Quantity</dt><dd>{quantity}</dd></div>
            <div><dt>Price per ticket</dt><dd>{money(ticket.price)}</dd></div>
            <div className="checkout-total"><dt>Total amount</dt><dd>{money(total)}</dd></div>
          </dl>
          <small className="checkout-assurance">Your selection is reserved during this session.</small>
        </aside>

        <form ref={formRef} className="checkout-form" onSubmit={submit} autoComplete="off" noValidate>
          <section className="checkout-card">
            <div className="checkout-section-heading"><span>01</span><div><p>Attendee</p><h2>Personal Details &amp;<br />Contact Information</h2></div></div>
            <div className="checkout-fields">
              <label>First Name<input name="firstName" value={form.firstName} onChange={updateField} autoComplete="off" placeholder="Enter first name" aria-invalid={Boolean(errors.firstName)} />{errors.firstName && <small>{errors.firstName}</small>}</label>
              <label>Last Name<input name="lastName" value={form.lastName} onChange={updateField} autoComplete="off" placeholder="Enter last name" aria-invalid={Boolean(errors.lastName)} />{errors.lastName && <small>{errors.lastName}</small>}</label>
              <label className="field-wide">Email Address<input type="email" name="email" placeholder="Enter email address" value={form.email} onChange={updateField} autoComplete="off" aria-invalid={Boolean(errors.email)} />{errors.email && <small>{errors.email}</small>}</label>
              <label className="field-wide">Phone Number<input type="tel" name="phone" value={form.phone} onChange={updateField} autoComplete="off" placeholder="07XX XXX XXX" aria-invalid={Boolean(errors.phone)} />{errors.phone && <small>{errors.phone}</small>}</label>
            </div>
          </section>

          <section className="checkout-card payment-card">
            <div className="checkout-section-heading"><span>02</span><div><p>Payment</p><h2>Payment Information</h2></div></div>
            <div className="payment-methods payment-methods--single" aria-label="Payment method">
              <button className="is-selected" type="button" aria-pressed="true" onClick={focusPaymentAction}>
                <span>M-Pesa</span>
                <strong>STK push</strong>
                <small>Receive a prompt on your phone and confirm with your PIN.</small>
              </button>
            </div>
            <ol className="payment-steps">
              <li><span>1</span>Tap Make payment and approve the STK prompt on your phone.</li>
              <li><span>3</span>Your ticket is issued immediately after we confirm payment.</li>
              <li><span>4</span>The next screen updates itself and shows your QR ticket.</li>
            </ol>
            {paymentError && <small className="checkout-payment-error" role="alert">{paymentError}</small>}
          </section>

          <Button className="checkout-submit" variant="primary" type="submit" disabled={isPaying}>{isPaying ? "Sending STK prompt…" : "Make payment"} <span>→</span></Button>
        </form>
      </div>
    </main>
  );
}

export default Checkout;
