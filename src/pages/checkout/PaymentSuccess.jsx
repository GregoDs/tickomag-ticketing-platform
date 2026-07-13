import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {doc, onSnapshot} from "firebase/firestore";
import { db } from "../../services/firebase";
import { Link, useLocation } from "react-router-dom";
import Button from "../../components/ui/Button";
import Confetti from "../../components/ui/Confetti";
import TicketCard from "../../components/tickets/TicketCard";
import TicketStatus from "../../components/tickets/TicketStatus";
// import { getMpesaPaymentStatus } from "../../services/mpesa.service";
import { downloadTicketSvg } from "../../utils/downloadTicket";
import "./PaymentSuccess.css";
import "./Ticket.css";

const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;

function PaymentSuccess() {
  const { state } = useLocation();
  const checkoutRequestID = state?.checkoutRequestID || window.localStorage.getItem("tickomag:lastCheckoutRequestID") || "";
  const order = useMemo(() => state?.order || null, [state]);
  const [payment, setPayment] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  // const [attempts, setAttempts] = useState(0);
  const ticketRef = useRef(null);

  useLayoutEffect(() => window.scrollTo(0, 0), []);

  // useEffect(() => {
  //   if (!checkoutRequestID) return undefined;

  //   let cancelled = false;
  //   let timer;

  //   const loadStatus = async () => {
  //     try {
  //       const response = await getMpesaPaymentStatus(checkoutRequestID);
  //       if (cancelled) return;

  //       setPayment(response.data.payment);
  //       setTicket(response.data.ticket);
  //       setError("");

  //       if (!response.data.ticket && response.data.payment?.status !== "failed" && attempts < 30) {
  //         timer = window.setTimeout(() => setAttempts((current) => current + 1), 3000);
  //       }
  //     } catch (statusError) {
  //       if (cancelled) return;
  //       console.error("Payment status check failed:", statusError);
  //       setError("We could not refresh your payment status. Try again in a moment.");
  //       if (attempts < 30) {
  //         timer = window.setTimeout(() => setAttempts((current) => current + 1), 4000);
  //       }
  //     }
  //   };

  //   loadStatus();

  //   return () => {
  //     cancelled = true;
  //     window.clearTimeout(timer);
  //   };
  // }, [attempts, checkoutRequestID]);



 useEffect(() => {
  if(!checkoutRequestID) return undefined;

  const paymentRef = doc(db,"mpesaPayments",checkoutRequestID);
  let unsubscribe = () => {};

  unsubscribe = onSnapshot(
    paymentRef,
    (snapshot)=>{
      if(!snapshot.exists()) return;

      const paymentData = snapshot.data();

      setPayment(paymentData);

      if (
        paymentData.status === "failed" ||
        paymentData.status === "timed_out" ||
        (paymentData.status === "paid" && paymentData.ticketId)
      ) {
        unsubscribe();
      }
    },
    (snapshotError) => {
      console.error("Payment listener failed:", snapshotError);
      setError("We could not refresh your payment status. Try again in a moment.");
    }
  );
   return unsubscribe;
 

 }, [checkoutRequestID]);

 useEffect(() => {
   if(!payment?.ticketId) return;

   const ticketRef = doc(db,"tickets", payment.ticketId);

    const unsubscribe = onSnapshot(
    ticketRef,
    (snapshot) => {
      if(!snapshot.exists()) return;

      const ticketData = snapshot.data();

      setTicket(ticketData);
    },
    (snapshotError) => {
      console.error("Ticket listener failed:", snapshotError);
      setError("We could not load your ticket. Try refreshing this page.");
    }
   );
   return unsubscribe;
 },[payment?.ticketId]);



  if (!checkoutRequestID) {
    return (
      <main className="payment-success-page payment-success-state">
        <p>No payment session was found.</p>
        <Button variant="primary" to="/">Browse events</Button>
      </main>
    );
  }

  const isFailed = payment?.status === "failed";
  const isTimedOut = payment?.status === "timed_out";
  const isResolvedWithoutTicket = isFailed || isTimedOut;
  const displayTicket = ticket || null;
  const summaryEvent = order?.event || displayTicket?.event || {};
  const summaryTicket = order?.ticket || displayTicket?.ticket || {};
  const summaryTotal = order?.total ?? displayTicket?.total ?? payment?.amount ?? 0;

  return (
    <main className="payment-success-page">
      {displayTicket && <Confetti />}

      <section className="payment-success-hero">
        <Link to="/">← Back to events</Link>
        <p>{displayTicket ? "Payment confirmed" : isFailed ? "Payment failed" : isTimedOut ? "Payment timed out" : "Payment processing"}</p>
        <h1>{displayTicket ? <>Your ticket<br /><em>is ready.</em></> : isTimedOut ? <>Payment<br /><em>timed out.</em></> : <>Finish on<br /><em>your phone.</em></>}</h1>
        <span>
          {displayTicket
            ? "Your M-Pesa payment was confirmed and your scannable ticket has been issued."
            : isFailed
              ? payment?.failureReason || "M-Pesa could not complete this payment."
              : isTimedOut
                ? "We did not receive an M-Pesa callback in time. If you later complete the payment, the backend can still confirm it and issue your ticket."
                : "Approve the STK prompt on your phone. This page will update automatically after confirmation."}
        </span>
      </section>

      <div className="payment-success-shell">
        <section className="payment-status-panel">
          <div className={`live-payment-status live-payment-status--${displayTicket ? "ready" : isFailed ? "failed" : isTimedOut ? "timed_out" : "pending"}`}>
            <TicketStatus status={displayTicket ? displayTicket.scanStatus : isFailed ? "failed" : isTimedOut ? "timed_out" : "pending"} />
            <div>
              <span>{payment?.mpesaReceiptNumber || checkoutRequestID}</span>
              <strong>{displayTicket ? "Ticket issued" : isFailed ? "Payment not completed" : isTimedOut ? "Payment timed out" : "Waiting for M-Pesa callback"}</strong>
            </div>
          </div>

          {displayTicket ? (
            <>
              <TicketCard ref={ticketRef} ticket={displayTicket} />
              <div className="payment-ticket-actions">
                <Button variant="primary" type="button" onClick={() => downloadTicketSvg(displayTicket, ticketRef.current?.querySelector(".ticket-qr-canvas svg"))}>
                  Download ticket
                </Button>
                <Button type="button" onClick={() => window.print()}>
                  Print ticket
                </Button>
              </div>
            </>
          ) : (
            <div className="payment-wait-card">
              <span>Checkout request</span>
              <strong>{checkoutRequestID}</strong>
              <p>{isResolvedWithoutTicket ? "Start a fresh checkout if you still want this ticket." : "Keep this tab open while we wait for Safaricom to confirm the payment."}</p>
              {/* <div className="payment-wait-actions">
                {!isFailed && <Button variant="primary" type="button" onClick={() => setAttempts((current) => current + 1)}>Refresh status</Button>}
                <Button type="button" onClick={restartCheckout} disabled={isRestarting}>
                  {isRestarting ? "Loading checkout…" : isFailed ? "Try payment again" : "Start over"}
                </Button>
              </div> */}
            </div>
          )}

          {error && <small className="payment-status-error" role="alert">{error}</small>}
        </section>

        <aside className="payment-success-summary">
          <p>Order summary</p>
          <dl>
            <div><dt>Event</dt><dd>{summaryEvent.title || "Event ticket"}</dd></div>
            <div><dt>Ticket</dt><dd>{summaryTicket.name || "Admission"} × {order?.quantity || displayTicket?.quantity || 1}</dd></div>
            <div><dt>Total</dt><dd>{money(summaryTotal)}</dd></div>
            <div><dt>Phone</dt><dd>{payment?.phone || order?.phone}</dd></div>
            <div><dt>Status</dt><dd>{payment?.status || "pending"}</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

export default PaymentSuccess;
