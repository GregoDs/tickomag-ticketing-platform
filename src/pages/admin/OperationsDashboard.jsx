import { useEffect, useMemo, useState } from "react";
import { events } from "../../data/events";
import useAuth from "../../hooks/useAuth";
import { subscribeToOperations } from "../../services/operations.service";
import "./OperationsDashboard.css";

const MASQUERADE_ALIASES = ["masquerade-2026", "masquerade_mku_2026"];
const INACTIVE_STATUSES = ["refunded", "cancelled", "revoked"];

const eventOptions = events.map((event) => ({
  ...event,
  aliases: event.id === "masquerade-2026" ? MASQUERADE_ALIASES : [event.id],
}));

const money = (value = 0) => new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const number = (value = 0) => Number(value || 0).toLocaleString("en-KE");

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDateTime = (value) => {
  const millis = toMillis(value);
  if (!millis) return "Not recorded";
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
};

const recordEventId = (record) => record?.eventId || record?.event?.id || "";
const matchesEvent = (record, aliases) => aliases.includes(recordEventId(record));
const ticketStatus = (ticket) => String(
  ticket.status || (ticket.scanStatus === "consumed" ? "consumed" : "active")
).toLowerCase();
const ticketValue = (ticket) => Number(
  ticket.total ?? ticket.amount ?? ((ticket.ticket?.unitPrice || 0) * (ticket.quantity || 1))
);

function OperationsDashboard() {
  const { adminProfile } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState(
    () => window.localStorage.getItem("tickomag:adminEvent") || "masquerade-2026"
  );
  const [operations, setOperations] = useState({
    payments: [], tickets: [], requests: [], scans: [], loading: true, updatedAt: null,
  });
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => subscribeToOperations((data) => {
    setOperations(data);
    setConnectionError("");
  }, (error, source) => {
    console.error(`Live ${source} subscription failed:`, error);
    setConnectionError(`Live ${source} data could not be loaded. Check this admin's Firestore permissions.`);
  }), []);

  const selectEvent = (eventId) => {
    setSelectedEventId(eventId);
    window.localStorage.setItem("tickomag:adminEvent", eventId);
  };

  const availableEvents = useMemo(() => {
    const permittedIds = Array.isArray(adminProfile?.eventIds) ? adminProfile.eventIds : [];
    if (permittedIds.length === 0) return eventOptions;
    return eventOptions.filter((event) =>
      event.aliases.some((eventId) => permittedIds.includes(eventId))
    );
  }, [adminProfile]);

  const selectedEvent = availableEvents.find((event) => event.id === selectedEventId) || availableEvents[0] || eventOptions[0];

  const report = useMemo(() => {
    const aliases = selectedEvent.aliases;
    const ticketsById = new Map(operations.tickets.map((ticket) => [ticket.id, ticket]));
    const tickets = operations.tickets.filter((ticket) => matchesEvent(ticket, aliases));
    const selectedPaymentIds = new Set(tickets.flatMap((ticket) => [
      ticket.paymentId,
      ticket.checkoutRequestID,
    ]).filter(Boolean));
    const payments = operations.payments.filter((payment) =>
      matchesEvent(payment, aliases) ||
      selectedPaymentIds.has(payment.id) ||
      selectedPaymentIds.has(payment.checkoutRequestID)
    );
    const requests = operations.requests.filter((request) => matchesEvent(request, aliases));
    const scans = operations.scans.filter((scan) => {
      if (matchesEvent(scan, aliases)) return true;
      const linkedTicket = ticketsById.get(scan.ticketId);
      return linkedTicket ? matchesEvent(linkedTicket, aliases) : false;
    });

    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const failedPayments = payments.filter((payment) => payment.status === "failed");
    const pendingPayments = payments.filter((payment) => payment.status === "pending");
    const paidPaymentIds = new Set(paidPayments.flatMap((payment) => [
      payment.id,
      payment.checkoutRequestID,
    ]).filter(Boolean));
    const receiptBackedTickets = tickets.filter((ticket) =>
      ticket.mpesaReceiptNumber &&
      !paidPaymentIds.has(ticket.paymentId) &&
      !paidPaymentIds.has(ticket.checkoutRequestID)
    );
    const confirmedRevenue =
      paidPayments.reduce(
        (total, payment) => total + Number(payment.amountPaid ?? payment.amount ?? 0), 0
      ) +
      receiptBackedTickets.reduce(
        (total, ticket) => total + Number(ticket.amount ?? ticket.total ?? 0), 0
      );
    const confirmedPaymentCount = paidPayments.length + receiptBackedTickets.length;
    const expectedRevenue = tickets.reduce((total, ticket) => total + ticketValue(ticket), 0);
    const pendingValue = pendingPayments.reduce(
      (total, payment) => total + Number(payment.amount ?? payment.total ?? 0), 0
    );
    const issuedAdmissions = tickets.reduce(
      (total, ticket) => total + Number(ticket.quantity || 1), 0
    );
    const gateAdmissions = tickets
      .filter((ticket) => ticketStatus(ticket) === "consumed")
      .reduce((total, ticket) => total + Number(ticket.quantity || 1), 0);
    const lifecycle = tickets.reduce((counts, ticket) => {
      const status = ticketStatus(ticket);
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    const scanOutcomes = scans.reduce((counts, scan) => {
      const outcome = scan.outcome || "unknown";
      counts[outcome] = (counts[outcome] || 0) + 1;
      return counts;
    }, {});
    const requestOutcomes = requests.reduce((counts, request) => {
      const status = request.approvalStatus || "pending";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    const resolvedPayments = confirmedPaymentCount + failedPayments.length;
    const paymentRate = resolvedPayments
      ? Math.round((confirmedPaymentCount / resolvedPayments) * 100)
      : 0;
    const paidWithoutTicket = paidPayments.filter((payment) => !payment.ticketIssued).length;

    const ticketTypes = [...tickets.reduce((groups, ticket) => {
      const name = ticket.ticket?.name || "Admission";
      const current = groups.get(name) || { name, issued: 0, admissions: 0, revenue: 0, consumed: 0 };
      current.issued += 1;
      current.admissions += Number(ticket.quantity || 1);
      current.revenue += ticketValue(ticket);
      if (ticketStatus(ticket) === "consumed") current.consumed += 1;
      groups.set(name, current);
      return groups;
    }, new Map()).values()].sort((first, second) => second.admissions - first.admissions);

    const activity = [
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: "Payment",
        title: payment.status === "paid" ? `Payment confirmed · ${money(payment.amountPaid ?? payment.amount)}` : `Payment ${payment.status || "updated"}`,
        detail: payment.mpesaReceiptNumber || payment.checkoutRequestID || payment.id,
        status: payment.status || "pending",
        at: payment.paidAt || payment.updatedAt || payment.createdAt,
      })),
      ...tickets.map((ticket) => ({
        id: `ticket-${ticket.id}`,
        type: "Ticket",
        title: `${ticket.ticketCode || "Ticket"} · ${ticketStatus(ticket)}`,
        detail: `${ticket.attendee?.firstName || ""} ${ticket.attendee?.lastName || ""}`.trim() || "Ticket holder",
        status: ticketStatus(ticket),
        at: ticket.scannedAt || ticket.issuedAt || ticket.createdAt,
      })),
      ...scans.map((scan) => ({
        id: `scan-${scan.id}`,
        type: "Scan",
        title: scan.outcome === "valid" ? "Entry approved" : `Scan ${String(scan.outcome || "unknown").replaceAll("_", " ")}`,
        detail: scan.ticketCode || scan.ticketId || scan.reason || "Unknown QR",
        status: scan.outcome || "unknown",
        at: scan.scannedAt,
      })),
    ].sort((first, second) => toMillis(second.at) - toMillis(first.at)).slice(0, 10);

    const ledger = [...tickets]
      .sort((first, second) => toMillis(second.scannedAt || second.issuedAt || second.createdAt) - toMillis(first.scannedAt || first.issuedAt || first.createdAt))
      .slice(0, 12);

    return {
      tickets,
      payments,
      scans,
      issuedAdmissions,
      gateAdmissions,
      expectedRevenue,
      confirmedRevenue,
      pendingValue,
      paidPayments: confirmedPaymentCount,
      failedPayments: failedPayments.length,
      pendingPayments: pendingPayments.length,
      paymentRate,
      paidWithoutTicket,
      lifecycle,
      scanOutcomes,
      requestOutcomes,
      ticketTypes,
      activity,
      ledger,
    };
  }, [operations, selectedEvent]);

  const maxTicketAdmissions = Math.max(...report.ticketTypes.map((item) => item.admissions), 1);
  const alertCount = report.pendingPayments + report.failedPayments + report.paidWithoutTicket +
    INACTIVE_STATUSES.reduce((total, status) => total + Number(report.lifecycle[status] || 0), 0);

  return (
    <main className="operations-dashboard">
      <header className="operations-header">
        <div>
          <p>Live event control</p>
          <h1>Operations dashboard</h1>
          <span>Payments, ticket issuance and gate activity reconciled in real time.</span>
        </div>
        <div className="operations-live"><i />Live · {operations.updatedAt ? formatDateTime(operations.updatedAt) : "connecting"}</div>
      </header>

      <section className="event-switcher" aria-label="Selected event">
        <label htmlFor="operations-event">Operating event</label>
        <select id="operations-event" value={selectedEvent.id} onChange={(event) => selectEvent(event.target.value)}>
          {availableEvents.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.area}</option>)}
        </select>
        <div>
          <strong>{selectedEvent.title}</strong>
          <span>{new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedEvent.date))} · {selectedEvent.venue}</span>
          <code>{selectedEvent.id}</code>
        </div>
      </section>

      {connectionError && <p className="operations-error" role="alert">{connectionError}</p>}
      {operations.loading && <p className="operations-loading">Connecting to live event records…</p>}

      <section className="operations-kpis" aria-label="Primary event metrics">
        <article><span>Confirmed revenue</span><strong>{money(report.confirmedRevenue)}</strong><small>{report.paidPayments} successful payments</small></article>
        <article><span>Expected ticket value</span><strong>{money(report.expectedRevenue)}</strong><small>{money(report.expectedRevenue - report.confirmedRevenue)} reconciliation difference</small></article>
        <article><span>Admissions released</span><strong>{number(report.issuedAdmissions)}</strong><small>{report.tickets.length} issued QR tickets</small></article>
        <article><span>Gate entries</span><strong>{number(report.gateAdmissions)}</strong><small>{number(report.lifecycle.consumed)} QR tickets consumed</small></article>
      </section>

      <div className="operations-grid">
        <section className="operations-panel operations-finance">
          <header><div><p>Financial control</p><h2>Payment reconciliation</h2></div><span>{report.paymentRate}% completion</span></header>
          <div className="finance-progress"><i style={{ width: `${report.paymentRate}%` }} /></div>
          <dl className="operations-stat-list">
            <div><dt>Paid</dt><dd>{report.paidPayments}</dd><small>{money(report.confirmedRevenue)}</small></div>
            <div><dt>Pending callback</dt><dd>{report.pendingPayments}</dd><small>{money(report.pendingValue)}</small></div>
            <div><dt>Failed</dt><dd>{report.failedPayments}</dd><small>Requires new checkout</small></div>
            <div className={report.paidWithoutTicket ? "needs-attention" : ""}><dt>Paid without ticket</dt><dd>{report.paidWithoutTicket}</dd><small>Issuance exceptions</small></div>
          </dl>
        </section>

        <section className="operations-panel">
          <header><div><p>Decision queue</p><h2>Ticket requests</h2></div><span>{number(Object.values(report.requestOutcomes).reduce((total, count) => total + count, 0))} total</span></header>
          <div className="status-bands">
            <div><span>Pending</span><strong>{report.requestOutcomes.pending || 0}</strong></div>
            <div><span>Approved</span><strong>{report.requestOutcomes.approved || 0}</strong></div>
            <div><span>Rejected</span><strong>{report.requestOutcomes.rejected || 0}</strong></div>
          </div>
        </section>

        <section className="operations-panel">
          <header><div><p>Ticket lifecycle</p><h2>Issued inventory</h2></div><span>{report.tickets.length} records</span></header>
          <div className="status-bands status-bands--tickets">
            <div><span>Active</span><strong>{report.lifecycle.active || 0}</strong></div>
            <div><span>Consumed</span><strong>{report.lifecycle.consumed || 0}</strong></div>
            <div><span>Refunded</span><strong>{report.lifecycle.refunded || 0}</strong></div>
            <div><span>Cancelled</span><strong>{report.lifecycle.cancelled || 0}</strong></div>
            <div><span>Revoked</span><strong>{report.lifecycle.revoked || 0}</strong></div>
          </div>
        </section>

        <section className="operations-panel">
          <header><div><p>Gate integrity</p><h2>Scanner outcomes</h2></div><span>{report.scans.length} attempts</span></header>
          <div className="status-bands status-bands--scans">
            <div><span>First scan</span><strong>{report.scanOutcomes.valid || 0}</strong></div>
            <div><span>Already used</span><strong>{report.scanOutcomes.already_used || 0}</strong></div>
            <div><span>Inactive</span><strong>{report.scanOutcomes.inactive || 0}</strong></div>
            <div><span>Invalid</span><strong>{report.scanOutcomes.invalid || 0}</strong></div>
          </div>
        </section>
      </div>

      <section className="operations-panel ticket-mix">
        <header><div><p>Sales mix</p><h2>Ticket types</h2></div><span>{report.ticketTypes.length} categories</span></header>
        {report.ticketTypes.length === 0 ? <p className="operations-empty">No issued tickets for this event yet.</p> : report.ticketTypes.map((item) => (
          <article key={item.name}>
            <div><strong>{item.name}</strong><span>{item.admissions} admissions · {item.consumed} scanned</span></div>
            <div className="ticket-mix-bar"><i style={{ width: `${(item.admissions / maxTicketAdmissions) * 100}%` }} /></div>
            <strong>{money(item.revenue)}</strong>
          </article>
        ))}
      </section>

      <div className="operations-audit-grid">
        <section className="operations-panel activity-feed">
          <header><div><p>Audit trail</p><h2>Recent activity</h2></div><span>Newest first</span></header>
          {report.activity.length === 0 ? <p className="operations-empty">No event activity recorded.</p> : report.activity.map((item) => (
            <article key={item.id}>
              <i className={`activity-dot activity-dot--${item.status}`} />
              <div><span>{item.type}</span><strong>{item.title}</strong><small>{item.detail}</small></div>
              <time>{formatDateTime(item.at)}</time>
            </article>
          ))}
        </section>

        <aside className="operations-panel operations-alerts">
          <header><div><p>Exceptions</p><h2>Needs attention</h2></div><span>{alertCount}</span></header>
          <dl>
            <div><dt>Pending callbacks</dt><dd>{report.pendingPayments}</dd></div>
            <div><dt>Failed payments</dt><dd>{report.failedPayments}</dd></div>
            <div><dt>Paid, no ticket</dt><dd>{report.paidWithoutTicket}</dd></div>
            <div><dt>Duplicate scans</dt><dd>{report.scanOutcomes.already_used || 0}</dd></div>
            <div><dt>Refunded / cancelled / revoked</dt><dd>{INACTIVE_STATUSES.reduce((total, status) => total + Number(report.lifecycle[status] || 0), 0)}</dd></div>
          </dl>
        </aside>
      </div>

      <section className="operations-panel ticket-ledger">
        <header><div><p>Ticket audit</p><h2>Latest issued tickets</h2></div><span>{report.ledger.length} shown</span></header>
        <div className="ledger-table" role="table" aria-label="Latest issued tickets">
          <div className="ledger-row ledger-head" role="row"><span>Ticket</span><span>Holder</span><span>Type</span><span>Value</span><span>Status</span><span>Last activity</span></div>
          {report.ledger.length === 0 ? <p className="operations-empty">No tickets to audit.</p> : report.ledger.map((ticket) => (
            <div className="ledger-row" role="row" key={ticket.id}>
              <strong>{ticket.ticketCode || ticket.id}</strong>
              <span>{`${ticket.attendee?.firstName || ""} ${ticket.attendee?.lastName || ""}`.trim() || "Not provided"}</span>
              <span>{ticket.ticket?.name || "Admission"} × {ticket.quantity || 1}</span>
              <span>{money(ticketValue(ticket))}</span>
              <span className={`ledger-status ledger-status--${ticketStatus(ticket)}`}>{ticketStatus(ticket)}</span>
              <time>{formatDateTime(ticket.scannedAt || ticket.issuedAt || ticket.createdAt)}</time>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default OperationsDashboard;
