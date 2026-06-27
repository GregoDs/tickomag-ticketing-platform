import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import { generateTicketCode } from "../utils/generateTicketCode";
import { generateQRCodePayload } from "../utils/generateQRCode";
import { sha256Hex } from "../utils/sha256";

const ticketRequests = collection(db, "ticketRequests");

const hashValue = sha256Hex;

const createOrderId = (requestId) => {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `TM-${date}-${requestId.slice(0, 8).toUpperCase()}`;
};

export function normalizePhoneNumber(phone = "") {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

export async function createTicketRequest(data) {
  const normalizedCode = data.mpesaCode.trim().toUpperCase();
  const normalizedPhone = normalizePhoneNumber(data.phone || data.attendee?.phone);
  const paymentReferenceId = await hashValue(normalizedCode);
  const statusReferenceId = await hashValue(`${normalizedCode}:${normalizedPhone}`);
  const paymentReference = doc(db, "manualMpesaPaymentLookups", paymentReferenceId);
  const statusReference = doc(db, "requestStatuses", statusReferenceId);
  const requestReference = doc(ticketRequests);
  const orderId = createOrderId(requestReference.id);

  return runTransaction(db, async (transaction) => {
    const existingPayment = await transaction.get(paymentReference);
    if (existingPayment.exists()) {
      const error = new Error("This M-Pesa code has already been submitted.");
      error.code = "duplicate-payment";
      throw error;
    }

    const createdAt = serverTimestamp();
    transaction.set(requestReference, {
      ...data,
      mpesaCode: normalizedCode,
      requestId: requestReference.id,
      orderId,
      phoneNormalized: normalizedPhone,
      approvalStatus: "pending",
      requestStatus: "submitted",
      ticketRequested: false,
      createdAt,
      updatedAt: createdAt,
    });

    transaction.set(paymentReference, {
      mpesaCode: normalizedCode,
      requestId: requestReference.id,
      orderId,
      createdAt,
    });

    transaction.set(statusReference, {
      requestId: requestReference.id,
      orderId,
      approvalStatus: "pending",
      requestStatus: "submitted",
      ticketStatus: "not_issued",
      ticketId: null,
      attendee: {
        firstName: data.attendee?.firstName || data.firstName || "",
        lastName: data.attendee?.lastName || data.lastName || "",
        phone: data.attendee?.phone || data.phone || "",
      },
      event: {
        id: data.event?.id || data.eventId || "",
        title: data.event?.title || data.eventTitle || "",
        date: data.event?.date || data.eventDate || "",
        venue: data.event?.venue || data.eventVenue || "",
      },
      ticket: {
        id: data.ticket?.id || data.ticketId || "",
        name: data.ticket?.name || data.ticketType || "",
        quantity: Number(data.ticket?.quantity ?? data.quantity ?? 1),
      },
      quantity: Number(data.quantity ?? 1),
      total: Number(data.total ?? 0),
      createdAt,
      updatedAt: createdAt,
    });

    return { requestId: requestReference.id, orderId };
  });
}

export async function getTicketRequestByPayment(mpesaCode, phone) {
  const normalizedCode = mpesaCode.trim().toUpperCase();
  const normalizedPhone = normalizePhoneNumber(phone);
  const statusReferenceId = await hashValue(`${normalizedCode}:${normalizedPhone}`);
  const statusDocument = await getDoc(doc(db, "requestStatuses", statusReferenceId));

  if (!statusDocument.exists()) return null;
  const statusData = statusDocument.data();
  return {
    id: statusData.requestId,
    ...statusData,
    mpesaCode: normalizedCode,
  };
}

export async function subscribeToTicketRequestByPayment(mpesaCode, phone, onStatus, onError) {
  const normalizedCode = mpesaCode.trim().toUpperCase();
  const normalizedPhone = normalizePhoneNumber(phone);
  const statusReferenceId = await hashValue(`${normalizedCode}:${normalizedPhone}`);

  return onSnapshot(doc(db, "requestStatuses", statusReferenceId), (snapshot) => {
    if (!snapshot.exists()) {
      onStatus(null);
      return;
    }
    const statusData = snapshot.data();
    onStatus({
      id: statusData.requestId,
      ...statusData,
      mpesaCode: normalizedCode,
    });
  }, onError);
}

export function subscribeToTicketRequests(onRequests, onError) {
  const requestsQuery = query(ticketRequests, orderBy("createdAt", "asc"));
  return onSnapshot(requestsQuery, (snapshot) => {
    onRequests(snapshot.docs.map((requestDocument) => ({
      id: requestDocument.id,
      ...requestDocument.data(),
    })));
  }, onError);
}

const createScanToken = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export async function reviewTicketRequest(requestId, decision, adminUser) {
  if (!["approved", "rejected"].includes(decision)) throw new Error("Invalid review decision.");

  const requestRef = doc(db, "ticketRequests", requestId);
  const ticketRef = decision === "approved" ? doc(collection(db, "tickets")) : null;
  const scanToken = decision === "approved" ? createScanToken() : null;
  const ticketCode = ticketRef ? generateTicketCode(ticketRef.id) : null;
  const qrPayload = ticketRef ? generateQRCodePayload(ticketRef.id, scanToken) : null;

  return runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error("Ticket request no longer exists.");

    const requestData = requestSnapshot.data();
    if (requestData.approvalStatus !== "pending") {
      const error = new Error(`This request is already ${requestData.approvalStatus}.`);
      error.code = "already-processed";
      throw error;
    }

    let approvedPaymentReference = null;
    if (decision === "approved") {
      const mpesaCode = requestData.mpesaCode || requestData.payment?.transactionCode || "";
      if (!mpesaCode) throw new Error("This request has no M-Pesa transaction code.");
      const paymentReferenceId = await hashValue(mpesaCode.trim().toUpperCase());
      approvedPaymentReference = doc(db, "approvedPaymentReferences", paymentReferenceId);
      const approvedPaymentSnapshot = await transaction.get(approvedPaymentReference);
      if (approvedPaymentSnapshot.exists() && approvedPaymentSnapshot.data().requestId !== requestId) {
        const error = new Error("Another request with this M-Pesa code has already been approved.");
        error.code = "duplicate-payment-approved";
        throw error;
      }
    }

    const reviewedAt = serverTimestamp();
    const attendeeData = requestData.attendee || {};
    const eventData = requestData.event || {};
    const ticketData = requestData.ticket || {};
    const normalizedAttendee = {
      firstName: attendeeData.firstName || requestData.firstName || "",
      lastName: attendeeData.lastName || requestData.lastName || "",
      email: attendeeData.email || requestData.email || "",
      phone: attendeeData.phone || requestData.phone || "",
    };
    const normalizedEvent = {
      id: eventData.id || requestData.eventId || "",
      title: eventData.title || requestData.eventTitle || "",
      date: eventData.date || requestData.eventDate || "",
      venue: eventData.venue || requestData.eventVenue || "",
    };
    const normalizedTicket = {
      id: ticketData.id || requestData.ticketId || "",
      name: ticketData.name || requestData.ticketType || "",
      quantity: Number(ticketData.quantity ?? requestData.quantity ?? 1),
      unitPrice: Number(ticketData.unitPrice ?? requestData.unitPrice ?? 0),
    };
    const mpesaCode = requestData.mpesaCode || requestData.payment?.transactionCode || "";
    const normalizedPhone = requestData.phoneNormalized || normalizePhoneNumber(normalizedAttendee.phone);
    const statusReferenceId = await hashValue(`${mpesaCode.trim().toUpperCase()}:${normalizedPhone}`);
    const statusReference = doc(db, "requestStatuses", statusReferenceId);

    transaction.update(requestRef, {
      approvalStatus: decision,
      requestStatus: decision,
      "payment.status": decision === "approved" ? "verified" : "rejected",
      ticketStatus: decision === "approved" ? "issued" : "not_issued",
      ticketId: ticketRef?.id || null,
      ticketCode,
      reviewedAt,
      reviewedBy: {
        uid: adminUser.uid,
        email: adminUser.email || "",
      },
      updatedAt: reviewedAt,
    });

    transaction.set(statusReference, {
      requestId,
      orderId: requestData.orderId || "",
      approvalStatus: decision,
      requestStatus: decision,
      ticketStatus: decision === "approved" ? "issued" : "not_issued",
      ticketId: ticketRef?.id || null,
      ticketCode,
      issuedTicket: ticketRef ? {
        ticketId: ticketRef.id,
        ticketCode,
        qrPayload,
        scanStatus: "valid",
      } : null,
      attendee: {
        firstName: normalizedAttendee.firstName,
        lastName: normalizedAttendee.lastName,
        phone: normalizedAttendee.phone,
      },
      event: normalizedEvent,
      ticket: normalizedTicket,
      quantity: normalizedTicket.quantity,
      total: Number(requestData.total ?? 0),
      updatedAt: reviewedAt,
    }, { merge: true });

    if (ticketRef) {
      transaction.set(approvedPaymentReference, {
        mpesaCode: requestData.mpesaCode || requestData.payment?.transactionCode || "",
        requestId,
        orderId: requestData.orderId || "",
        approvedAt: reviewedAt,
      });
      transaction.set(ticketRef, {
        requestId,
        orderId: requestData.orderId || "",
        attendee: normalizedAttendee,
        event: normalizedEvent,
        ticket: normalizedTicket,
        quantity: normalizedTicket.quantity,
        total: Number(requestData.total ?? 0),
        mpesaCode: requestData.mpesaCode || requestData.payment?.transactionCode || "",
        ticketCode,
        scanToken,
        qrPayload,
        status: "active",
        scanStatus: "valid",
        scanAttempts: 0,
        scannedAt: null,
        scannedBy: null,
        issuedAt: reviewedAt,
        issuedBy: adminUser.uid,
      });
    }

    return { ticketId: ticketRef?.id || null, status: decision };
  });
}

export async function issueLegacyApprovedTicket(requestId) {
  const requestRef = doc(db, "ticketRequests", requestId);

  return runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error("Ticket request no longer exists.");
    const requestData = requestSnapshot.data();
    if (requestData.approvalStatus !== "approved" || !requestData.ticketId) {
      throw new Error("Only approved requests with an issued ticket can be upgraded.");
    }

    const ticketRef = doc(db, "tickets", requestData.ticketId);
    const ticketSnapshot = await transaction.get(ticketRef);
    if (!ticketSnapshot.exists()) throw new Error("The issued ticket document is missing.");
    const ticketData = ticketSnapshot.data();
    const scanToken = ticketData.scanToken || createScanToken();
    const ticketCode = ticketData.ticketCode || generateTicketCode(ticketRef.id);
    const qrPayload = generateQRCodePayload(ticketRef.id, scanToken);
    const mpesaCode = requestData.mpesaCode || requestData.payment?.transactionCode || "";
    const attendee = ticketData.attendee || requestData.attendee || {};
    const event = ticketData.event || requestData.event || {};
    const ticket = ticketData.ticket || requestData.ticket || {};
    const normalizedPhone = requestData.phoneNormalized || normalizePhoneNumber(attendee.phone || requestData.phone);
    const statusReferenceId = await hashValue(`${mpesaCode.trim().toUpperCase()}:${normalizedPhone}`);
    const updatedAt = serverTimestamp();

    transaction.update(ticketRef, {
      ticketCode,
      scanToken,
      qrPayload,
      status: ticketData.status || "active",
      scanStatus: ticketData.scanStatus || "valid",
      scanAttempts: Number(ticketData.scanAttempts || 0),
      scannedAt: ticketData.scannedAt || null,
      scannedBy: ticketData.scannedBy || null,
    });
    transaction.update(requestRef, { ticketCode, ticketStatus: "issued", updatedAt });
    transaction.set(doc(db, "requestStatuses", statusReferenceId), {
      requestId,
      orderId: requestData.orderId || ticketData.orderId || "",
      approvalStatus: "approved",
      requestStatus: "approved",
      ticketStatus: "issued",
      ticketId: ticketRef.id,
      ticketCode,
      issuedTicket: {
        ticketId: ticketRef.id,
        ticketCode,
        qrPayload,
        scanStatus: ticketData.scanStatus || "valid",
      },
      attendee: {
        firstName: attendee.firstName || requestData.firstName || "",
        lastName: attendee.lastName || requestData.lastName || "",
        phone: attendee.phone || requestData.phone || "",
      },
      event: {
        id: event.id || requestData.eventId || "",
        title: event.title || requestData.eventTitle || "",
        date: event.date || requestData.eventDate || "",
        venue: event.venue || requestData.eventVenue || "",
      },
      ticket: {
        id: ticket.id || requestData.ticketId || "",
        name: ticket.name || requestData.ticketType || "",
        quantity: Number(ticket.quantity ?? requestData.quantity ?? 1),
      },
      quantity: Number(ticketData.quantity ?? requestData.quantity ?? 1),
      total: Number(ticketData.total ?? requestData.total ?? 0),
      updatedAt,
    }, { merge: true });

    return { ticketId: ticketRef.id, ticketCode };
  });
}
