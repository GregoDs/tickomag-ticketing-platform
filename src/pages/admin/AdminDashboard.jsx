import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import useAuth from "../../hooks/useAuth";
import {
  issueLegacyApprovedTicket,
  reviewTicketRequest,
  subscribeToTicketRequests,
} from "../../services/orders.service";
import "./AdminDashboard.css";

const money = (value = 0) => `KSh ${Number(value).toLocaleString("en-KE")}`;
const timestamp = (value) => value?.toMillis?.() || 0;
const submittedTime = (value) => {
  if (!value?.toDate) return "Just now";
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value.toDate());
};

function AdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState("pending");
  const [sort, setSort] = useState("oldest");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(new Set());
  const [actionError, setActionError] = useState("");

  useEffect(() => subscribeToTicketRequests((nextRequests) => {
    setRequests(nextRequests);
    setLoading(false);
    setConnectionError("");
  }, (error) => {
    console.error("Admin request listener failed:", error);
    setConnectionError("Live requests could not be loaded. Check Firestore permissions and your connection.");
    setLoading(false);
  }), []);

  const zones = useMemo(() => [...new Set(requests.map((request) => request.ticketType || request.ticket?.name).filter(Boolean).map((value) => value.toLowerCase()))].sort(), [requests]);
  const counts = useMemo(() => requests.reduce((totals, request) => {
    const requestStatus = request.approvalStatus || "pending";
    totals[requestStatus] = (totals[requestStatus] || 0) + 1;
    return totals;
  }, { pending: 0, approved: 0, rejected: 0 }), [requests]);
  const duplicateRequestIds = useMemo(() => {
    const seenCodes = new Set();
    const duplicates = new Set();
    [...requests]
      .sort((first, second) => timestamp(first.createdAt) - timestamp(second.createdAt))
      .forEach((request) => {
        const code = (request.mpesaCode || request.payment?.transactionCode || "").toUpperCase();
        if (!code) return;
        if (seenCodes.has(code)) duplicates.add(request.id);
        else seenCodes.add(code);
      });
    return duplicates;
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests
      .filter((request) => zone === "all" || (request.ticketType || request.ticket?.name || "").toLowerCase() === zone)
      .filter((request) => status === "all" || (request.approvalStatus || "pending") === status)
      .filter((request) => !term || [
        request.mpesaCode,
        request.phone,
        request.attendee?.phone,
        request.email,
        request.attendee?.email,
        request.firstName,
        request.lastName,
        request.attendee?.firstName,
        request.attendee?.lastName,
      ].some((value) => String(value || "").toLowerCase().includes(term)))
      .sort((first, second) => sort === "oldest"
        ? timestamp(first.createdAt) - timestamp(second.createdAt)
        : timestamp(second.createdAt) - timestamp(first.createdAt));
  }, [requests, search, sort, status, zone]);

  const review = async (requestId, decision) => {
    setProcessing((current) => new Set(current).add(requestId));
    setActionError("");
    try {
      await reviewTicketRequest(requestId, decision, user);
    } catch (error) {
      console.error("Request review failed:", error);
      setActionError(["already-processed", "duplicate-payment-approved"].includes(error.code) ? error.message : "The request could not be updated. Refresh and try again.");
    } finally {
      setProcessing((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  };

  const generateLegacyTicket = async (requestId) => {
    setProcessing((current) => new Set(current).add(requestId));
    setActionError("");
    try {
      await issueLegacyApprovedTicket(requestId);
    } catch (error) {
      console.error("Legacy ticket generation failed:", error);
      setActionError(error.message || "The ticket could not be generated.");
    } finally {
      setProcessing((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div><p>Live operations</p><h1>Ticket requests</h1><span>Oldest payments are reviewed first unless gate pressure requires otherwise.</span></div>
        <div className="live-indicator"><i />Live</div>
      </header>

      <section className="admin-metrics" aria-label="Request totals">
        <button className={status === "pending" ? "active" : ""} onClick={() => setStatus("pending")}><span>Pending</span><strong>{counts.pending}</strong></button>
        <button className={status === "approved" ? "active" : ""} onClick={() => setStatus("approved")}><span>Approved</span><strong>{counts.approved}</strong></button>
        <button className={status === "rejected" ? "active" : ""} onClick={() => setStatus("rejected")}><span>Rejected</span><strong>{counts.rejected}</strong></button>
        <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}><span>Total</span><strong>{requests.length}</strong></button>
      </section>

      <section className="admin-controls">
        <label className="admin-search"><span>Find payment</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="M-Pesa code, phone, name or email" /></label>
        <label><span>Zone</span><select value={zone} onChange={(event) => setZone(event.target.value)}><option value="all">All zones</option>{zones.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <label><span>Order</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>
      </section>

      {connectionError && <p className="admin-error" role="alert">{connectionError}</p>}
      {actionError && <p className="admin-error" role="alert">{actionError}</p>}

      <section className="request-queue">
        <div className="queue-heading"><span>{visibleRequests.length} shown</span><span>Updated automatically</span></div>
        {loading ? <p className="queue-state">Connecting to the live queue…</p> : visibleRequests.length === 0 ? <p className="queue-state">No requests match these filters.</p> : visibleRequests.map((request, index) => {
          const attendee = request.attendee || request;
          const ticket = request.ticket || {};
          const requestStatus = request.approvalStatus || "pending";
          const isProcessing = processing.has(request.id);
          const isDuplicate = duplicateRequestIds.has(request.id);
          return (
            <article className="request-row" key={request.id}>
              <div className="request-position"><span>Queue</span><strong>{String(index + 1).padStart(2, "0")}</strong></div>
              <div className="request-person"><span>{submittedTime(request.createdAt)}</span><small className="request-order-id">Order {request.orderId || request.id}</small><h2>{attendee.firstName} {attendee.lastName}</h2><p>{attendee.phone} · {attendee.email}</p></div>
              <div className="request-payment"><span>M-Pesa code</span><strong>{request.mpesaCode || request.payment?.transactionCode}</strong><small>{money(request.total)}</small></div>
              <div className="request-ticket"><span>Zone / ticket</span><strong>{request.ticketType || ticket.name}</strong><small>Quantity {request.quantity || ticket.quantity}</small></div>
              <div className={`request-status request-status--${isDuplicate ? "duplicate" : requestStatus}`}><i />{isDuplicate ? "duplicate code" : requestStatus}</div>
              <div className="request-actions">
                {requestStatus === "pending" ? <><Button type="button" onClick={() => review(request.id, "rejected")} disabled={isProcessing}>Reject</Button><Button variant="primary" type="button" onClick={() => review(request.id, "approved")} disabled={isProcessing || isDuplicate} title={isDuplicate ? "Reject this later duplicate; the oldest matching request is the canonical record." : "Approve request"}>{isProcessing ? "Working…" : isDuplicate ? "Duplicate" : "Approve"}</Button></> : requestStatus === "approved" && !request.ticketCode ? <Button variant="primary" type="button" onClick={() => generateLegacyTicket(request.id)} disabled={isProcessing}>{isProcessing ? "Generating…" : "Generate ticket"}</Button> : <span>Reviewed by<br />{request.reviewedBy?.email || "Admin"}</span>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default AdminDashboard;
