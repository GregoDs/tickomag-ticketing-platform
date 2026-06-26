const { db } = require("../services/firebase.service");

function timestampToJson(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return value;
}

function publicPayment(paymentId, paymentData) {
  return {
    paymentId,
    checkoutRequestID: paymentData.checkoutRequestID || paymentId,
    merchantRequestID: paymentData.merchantRequestID || null,
    status: paymentData.status || "unknown",
    phone: paymentData.paidPhone || paymentData.phone || null,
    amount: paymentData.amountPaid || paymentData.amount || null,
    mpesaReceiptNumber: paymentData.mpesaReceiptNumber || null,
    ticketIssued: Boolean(paymentData.ticketIssued),
    ticketId: paymentData.ticketId || null,
    ticketCode: paymentData.ticketCode || null,
    failureCode: paymentData.failureCode || null,
    failureReason: paymentData.failureReason || null,
    createdAt: timestampToJson(paymentData.createdAt),
    paidAt: timestampToJson(paymentData.paidAt),
    updatedAt: timestampToJson(paymentData.updatedAt),
  };
}

function publicTicket(ticketId, ticketData) {
  return {
    ticketId,
    ticketCode: ticketData.ticketCode || null,
    qrPayload: ticketData.qrPayload || null,
    status: ticketData.status || null,
    scanStatus: ticketData.scanStatus || null,
    paymentMethod: ticketData.paymentMethod || null,
    paymentId: ticketData.paymentId || null,
    checkoutRequestID: ticketData.checkoutRequestID || null,
    phone: ticketData.phone || null,
    amount: ticketData.amount || null,
    eventId: ticketData.eventId || null,
    merchantAccount: ticketData.merchantAccount || null,
    mpesaReceiptNumber: ticketData.mpesaReceiptNumber || null,
    attendee: ticketData.attendee || null,
    event: ticketData.event || null,
    ticket: ticketData.ticket || null,
    quantity: ticketData.quantity || null,
    total: ticketData.total || null,
    orderId: ticketData.orderId || null,
    createdAt: timestampToJson(ticketData.createdAt),
  };
}

async function getPaymentStatus(req, res) {
  try {
    const { checkoutRequestID } = req.params;

    if (!checkoutRequestID) {
      return res.status(400).json({
        success: false,
        message: "checkoutRequestID is required",
      });
    }

    const paymentDoc = await db
      .collection("mpesaPayments")
      .doc(checkoutRequestID)
      .get();

    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = publicPayment(paymentDoc.id, paymentDoc.data());
    let ticket = null;

    if (payment.ticketId) {
      const ticketDoc = await db
        .collection("tickets")
        .doc(payment.ticketId)
        .get();

      if (ticketDoc.exists) {
        ticket = publicTicket(ticketDoc.id, ticketDoc.data());
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        payment,
        ticket,
      },
    });
  } catch (error) {
    console.error("Payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch payment status",
      error: error.message,
    });
  }
}

async function getTicket(req, res) {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "ticketId is required",
      });
    }

    const ticketDoc = await db
      .collection("tickets")
      .doc(ticketId)
      .get();

    if (!ticketDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ticket: publicTicket(ticketDoc.id, ticketDoc.data()),
      },
    });
  } catch (error) {
    console.error("Ticket fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch ticket",
      error: error.message,
    });
  }
}

module.exports = {
  getPaymentStatus,
  getTicket,
};
