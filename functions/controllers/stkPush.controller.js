const { stkPush } = require("../services/mpesa.service");
const { db } = require("../services/firebase.service");
const { getCheckoutQuote } = require("../services/event.service");
const { getPaymentTimeoutMinutes } = require("../services/payment-timeout.service");

function normalizeMpesaPhone(phone) {
  if (typeof phone !== "string" && typeof phone !== "number") {
    return "";
  }

  const digits = String(phone).trim().replace(/\D/g, "");

  if (/^0(7|1)\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^(7|1)\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  if (/^254(7|1)\d{8}$/.test(digits)) {
    return digits;
  }

  return "";
}

function requireNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateStkPushPayload(payload = {}) {
  const errors = [];
  const normalizedPhone = normalizeMpesaPhone(payload.phone);
  const quantity = payload.quantity === undefined ? 1 : Number(payload.quantity);

  if (!normalizedPhone) {
    errors.push("phone must be a valid Kenyan M-Pesa number.");
  }

  if (!requireNonEmptyString(payload.eventId)) {
    errors.push("eventId is required.");
  }

  if (!requireNonEmptyString(payload.ticketId)) {
    errors.push("ticketId is required.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push("quantity must be a positive integer.");
  }

  if (
    payload.attendee !== undefined &&
    (payload.attendee === null ||
      Array.isArray(payload.attendee) ||
      typeof payload.attendee !== "object")
  ) {
    errors.push("attendee must be an object when provided.");
  }

  return {
    errors,
    value: {
      phone: normalizedPhone,
      attendee: payload.attendee || {},
      eventId: requireNonEmptyString(payload.eventId)
        ? payload.eventId.trim()
        : "",
      ticketId: requireNonEmptyString(payload.ticketId)
        ? payload.ticketId.trim()
        : "",
      quantity,
    },
  };
}

async function initiateStkPush(req, res) {
  let paymentRef = null;

  try {
    const validation = validateStkPushPayload(req.body);

    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid STK push request.",
        errors: validation.errors,
      });
    }

    const {
      phone,
      attendee,
      eventId,
      ticketId,
      quantity,
    } = validation.value;

    const quote = await getCheckoutQuote({ eventId, ticketId, quantity });
    if (!quote.merchantAccount) {
      throw new Error(`Event ${quote.event.id} has no merchant account configured.`);
    }

    const response = await stkPush(
      phone,
      quote.total,
      quote.merchantAccount
    );

    const checkoutRequestID =
      response.CheckoutRequestID;
    const timeoutMinutes = getPaymentTimeoutMinutes();
    const timeoutAt = new Date(
      Date.now() + timeoutMinutes * 60 * 1000
    );

    // Create payment document using checkoutRequestID as document ID
    paymentRef = db
      .collection("mpesaPayments")
      .doc(checkoutRequestID);

    await paymentRef.set({
      checkoutRequestID,
      merchantRequestID:
        response.MerchantRequestID || null,
      phone,
      amount: quote.total,
      total: quote.total,
      attendee,
      event: quote.event,
      ticket: {
        ...quote.ticket,
        quantity: quote.quantity,
      },
      quantity: quote.quantity,
      eventId: quote.event.id,
      merchantAccount: quote.merchantAccount,
      status: "pending",
      timeoutAt,
      timeoutMinutes,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "STK Push initiated",
      data: {
        ...response,
        quote: {
          event: quote.event,
          ticket: quote.ticket,
          quantity: quote.quantity,
          total: quote.total,
        },
      }
    });

  } catch (error) {

    // If payment doc exists mark it failed
    if (paymentRef) {
      await paymentRef.update({
        status: "failed",
        error: error.message,
        failedAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.error("STK Push Error:", error);
    console.error(
      "Safaricom response:",
      error.response?.data
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: "STK Push failed",
      error: error.message
    });
  }
}

module.exports = {
  initiateStkPush
};
