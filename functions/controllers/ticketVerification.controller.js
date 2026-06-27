const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../services/firebase.service");

const INACTIVE_STATUSES = new Set(["refunded", "cancelled", "revoked"]);

function parseQrPayload(payload) {
  if (typeof payload !== "string" || payload.length > 500) return null;

  const parts = payload.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "TM1" || !parts[1] || !parts[2]) {
    return null;
  }

  return { ticketId: parts[1], scanToken: parts[2] };
}

function tokensMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function toIso(value) {
  return value?.toDate?.().toISOString() || value || null;
}

function scannerTicket(ticketId, data) {
  return {
    ticketId,
    ticketCode: data.ticketCode || null,
    status: data.status || (data.scanStatus === "consumed" ? "consumed" : "active"),
    scanStatus: data.scanStatus || "valid",
    attendee: data.attendee || null,
    event: data.event || null,
    ticket: data.ticket || null,
    quantity: Number(data.quantity || 1),
    scannedAt: toIso(data.scannedAt),
    scannedBy: data.scannedBy || null,
    scanAttempts: Number(data.scanAttempts || 0),
  };
}

function responseFor(outcome, ticket, message) {
  return {
    success: true,
    data: {
      outcome,
      valid: outcome === "valid",
      message,
      ticket,
    },
  };
}

async function recordMalformedScan(payload, scanner, eventId) {
  try {
    await db.collection("ticketScans").add({
      outcome: "invalid",
      reason: "malformed_payload",
      eventId: eventId || null,
      payloadHash: crypto
        .createHash("sha256")
        .update(String(payload || ""))
        .digest("hex"),
      scannedBy: scanner,
      scannedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Invalid scan audit failed:", error);
  }
}

async function verifyTicket(req, res) {
  const parsed = parseQrPayload(req.body?.payload);
  const scanEventId = typeof req.body?.eventId === "string" ? req.body.eventId : null;

  if (!parsed) {
    await recordMalformedScan(req.body?.payload, req.adminUser, scanEventId);

    return res.status(200).json(responseFor(
      "invalid",
      null,
      "Invalid ticket. This QR code is not recognized."
    ));
  }

  const ticketRef = db.collection("tickets").doc(parsed.ticketId);
  const scanRef = db.collection("ticketScans").doc();
  const scanner = req.adminUser;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const ticketDoc = await transaction.get(ticketRef);

      if (!ticketDoc.exists) {
        transaction.set(scanRef, {
          ticketId: parsed.ticketId,
          eventId: scanEventId,
          outcome: "invalid",
          reason: "ticket_not_found",
          scannedBy: scanner,
          scannedAt: FieldValue.serverTimestamp(),
        });
        return responseFor("invalid", null, "Invalid ticket. This QR code is not recognized.");
      }

      const ticketData = ticketDoc.data();
      if (!tokensMatch(parsed.scanToken, ticketData.scanToken)) {
        transaction.set(scanRef, {
          ticketId: ticketDoc.id,
          ticketCode: ticketData.ticketCode || null,
          eventId: ticketData.eventId || ticketData.event?.id || null,
          event: ticketData.event || null,
          outcome: "invalid",
          reason: "token_mismatch",
          scannedBy: scanner,
          scannedAt: FieldValue.serverTimestamp(),
        });
        return responseFor("invalid", null, "Invalid ticket. This QR code is not recognized.");
      }

      const scanAttempts = Number(ticketData.scanAttempts || 0) + 1;
      const attempt = {
        ticketId: ticketDoc.id,
        ticketCode: ticketData.ticketCode || null,
        eventId: ticketData.eventId || ticketData.event?.id || null,
        event: ticketData.event || null,
        outcome: "invalid",
        scannedBy: scanner,
        scannedAt: FieldValue.serverTimestamp(),
      };

      if (ticketData.scanStatus === "consumed" || ticketData.status === "consumed") {
        attempt.outcome = "already_used";
        transaction.set(scanRef, attempt);
        transaction.update(ticketRef, {
          scanAttempts,
          lastScanAttemptAt: FieldValue.serverTimestamp(),
          lastScanAttemptBy: scanner,
          lastScanOutcome: "already_used",
        });

        return responseFor(
          "already_used",
          scannerTicket(ticketDoc.id, { ...ticketData, scanAttempts }),
          "Ticket already used. Entry must not be allowed."
        );
      }

      const status = String(ticketData.status || "active").toLowerCase();
      if (INACTIVE_STATUSES.has(status)) {
        attempt.outcome = "inactive";
        attempt.ticketStatus = status;
        transaction.set(scanRef, attempt);
        transaction.update(ticketRef, {
          scanAttempts,
          lastScanAttemptAt: FieldValue.serverTimestamp(),
          lastScanAttemptBy: scanner,
          lastScanOutcome: "inactive",
        });

        return responseFor(
          "inactive",
          scannerTicket(ticketDoc.id, { ...ticketData, scanAttempts }),
          `Ticket ${status}. Entry must not be allowed.`
        );
      }

      if (status !== "active" || !["valid", "active"].includes(ticketData.scanStatus || "valid")) {
        attempt.outcome = "inactive";
        attempt.ticketStatus = status;
        transaction.set(scanRef, attempt);
        transaction.update(ticketRef, {
          scanAttempts,
          lastScanAttemptAt: FieldValue.serverTimestamp(),
          lastScanAttemptBy: scanner,
          lastScanOutcome: "inactive",
        });

        return responseFor(
          "inactive",
          scannerTicket(ticketDoc.id, { ...ticketData, scanAttempts }),
          "Ticket is not active. Entry must not be allowed."
        );
      }

      attempt.outcome = "valid";
      transaction.set(scanRef, attempt);
      transaction.update(ticketRef, {
        status: "consumed",
        scanStatus: "consumed",
        scannedAt: FieldValue.serverTimestamp(),
        scannedBy: scanner,
        scanAttempts,
        lastScanAttemptAt: FieldValue.serverTimestamp(),
        lastScanAttemptBy: scanner,
        lastScanOutcome: "valid",
      });

      return responseFor(
        "valid",
        scannerTicket(ticketDoc.id, {
          ...ticketData,
          status: "consumed",
          scanStatus: "consumed",
          scannedAt: new Date().toISOString(),
          scannedBy: scanner,
          scanAttempts,
        }),
        "Valid ticket. Entry approved."
      );
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Ticket verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "The ticket could not be verified. Try scanning again.",
    });
  }
}

module.exports = { verifyTicket, parseQrPayload };
