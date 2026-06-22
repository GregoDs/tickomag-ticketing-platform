import { useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import "./Checkout.css";

const initialForm = { firstName: "", lastName: "", email: "", phone: "" };
const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;

function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

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
    return Object.keys(next).length === 0;
  };

  const submit = (submitEvent) => {
    submitEvent.preventDefault();
    if (!validate()) return;
    navigate("/payment-verification", {
      state: {
        event,
        ticket,
        quantity,
        total,
        attendee: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
        },
        payment: { accountNumber: form.phone.trim(), tillNumber: "123456" },
      },
    });
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

        <form className="checkout-form" onSubmit={submit} noValidate>
          <section className="checkout-card">
            <div className="checkout-section-heading"><span>01</span><div><p>Attendee</p><h2>Personal Details &amp;<br />Contact Information</h2></div></div>
            <div className="checkout-fields">
              <label>First Name<input name="firstName" value={form.firstName} onChange={updateField} autoComplete="given-name" placeholder="Enter first name" aria-invalid={Boolean(errors.firstName)} />{errors.firstName && <small>{errors.firstName}</small>}</label>
              <label>Last Name<input name="lastName" value={form.lastName} onChange={updateField} autoComplete="family-name" placeholder="Enter last name" aria-invalid={Boolean(errors.lastName)} />{errors.lastName && <small>{errors.lastName}</small>}</label>
              <label className="field-wide">Email Address<input type="email" name="email" placeholder="Enter email address" value={form.email} onChange={updateField} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <small>{errors.email}</small>}</label>
              <label className="field-wide">Phone Number<input type="tel" name="phone" value={form.phone} onChange={updateField} autoComplete="tel" placeholder="07XX XXX XXX" aria-invalid={Boolean(errors.phone)} />{errors.phone && <small>{errors.phone}</small>}</label>
            </div>
          </section>

          <section className="checkout-card payment-card">
            <div className="checkout-section-heading"><span>02</span><div><p>Payment</p><h2>Payment Information</h2></div></div>
            <div className="payment-destination">
              <div><small>Account Number</small><strong>{"254706622071"}</strong></div><i>or</i><div><small>Till Number</small><strong>123456</strong></div>
            </div>
            <ol className="payment-steps">
              <li><span>1</span>Complete payment using M-Pesa.Go to the M-pesa app or Sim Toolkit.</li>
              <li><span>2</span>After payment from the M-pesa platform, click Confirm Payment.</li>
              <li><span>3</span>After clicking Confirm Payment at the button below, Enter your M-Pesa transaction code from your M-Pesa messages i.e QH12ABC345.</li>
              <li><span>4</span>Your ticket is issued after admin approval.</li>
            </ol>
          </section>

          <Button className="checkout-submit" variant="primary" type="submit">Confirm payment <span>→</span></Button>
        </form>
      </div>
    </main>
  );
}

export default Checkout;
