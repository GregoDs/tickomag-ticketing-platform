const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("./firebase.service");
const { generateTicketCode } = require("../utils/generateTicketCode");
const { generateScanToken } = require("../utils/generateScanToken");

async function confirmPayment({
  paymentId,
  checkoutRequestID,
  receipt,
  amount,
  phone,
}) {
  try {
    // Prevent duplicate ticket issuance
    const approvedPaymentRef = db
      .collection("approvedPayments")
      .doc(checkoutRequestID);

    const approvedPaymentDoc =
      await approvedPaymentRef.get();

    if (approvedPaymentDoc.exists) {
      console.log(
        `Ticket already issued for ${checkoutRequestID}`
      );
      return;
    }

    // Fetch payment document
    const paymentRef = db
      .collection("mpesaPayments")
      .doc(paymentId);

    const paymentDoc =
      await paymentRef.get();

    if (!paymentDoc.exists) {
      throw new Error(
        `Payment ${paymentId} not found`
      );
    }

    const paymentData =
      paymentDoc.data();

    // Create ticket reference first so the code is tied to the persisted ID
    const ticketRef =
      db.collection("tickets").doc();

    // Generate ticket details
    const ticketCode =
      generateTicketCode(ticketRef.id);

    const scanToken =
      generateScanToken();

    const qrPayload =
      `TM1.${ticketRef.id}.${scanToken}`;

    await ticketRef.set({
      ticketId: ticketRef.id,
      paymentMethod: "mpesa",
      paymentId,
      checkoutRequestID,
      phone,
      amount,
      total: Number(paymentData.total ?? amount ?? 0),
      attendee: paymentData.attendee || {},
      event: paymentData.event || {
        id: paymentData.eventId || "",
      },
      ticket: paymentData.ticket || {},
      quantity: Number(paymentData.quantity ?? 1),
      orderId: checkoutRequestID,
      eventId: paymentData.eventId,
      merchantAccount: paymentData.merchantAccount,
      mpesaReceiptNumber: receipt,
      ticketCode,
      scanToken,
      qrPayload,
      status: "active",
      scanStatus: "valid",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Mark payment as ticket issued
    await paymentRef.update({
      ticketIssued: true,
      ticketId: ticketRef.id,
      ticketCode,
      ticketIssuedAt:
        FieldValue.serverTimestamp(),
    });

    // Create duplicate protection reference
    await approvedPaymentRef.set({
      checkoutRequestID,
      ticketId: ticketRef.id,
      receipt,
      approvedAt:
        FieldValue.serverTimestamp(),
    });

    console.log(
      `Ticket issued successfully: ${ticketCode}`
    );

    return {
      ticketId: ticketRef.id,
      ticketCode,
    };

  } catch (error) {
    console.error(
      "Ticket creation error:",
      error
    );

    throw error;
  }
}

module.exports = {
  confirmPayment,
};
