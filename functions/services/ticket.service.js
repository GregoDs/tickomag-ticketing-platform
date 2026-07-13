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
    const approvedPaymentRef = db
      .collection("approvedPayments")
      .doc(checkoutRequestID);

    const paymentRef = db
      .collection("mpesaPayments")
      .doc(paymentId);

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

    const result = await db.runTransaction(async (transaction) => {
      const approvedPaymentDoc =
        await transaction.get(approvedPaymentRef);
      const paymentDoc =
        await transaction.get(paymentRef);

      if (!paymentDoc.exists) {
        throw new Error(
          `Payment ${paymentId} not found`
        );
      }

      const paymentData =
        paymentDoc.data();

      if (approvedPaymentDoc.exists) {
        const approvedPaymentData = approvedPaymentDoc.data();

        if (!paymentData.ticketIssued && approvedPaymentData.ticketId) {
          transaction.update(paymentRef, {
            ticketIssued: true,
            ticketId: approvedPaymentData.ticketId,
            ticketCode: approvedPaymentData.ticketCode || null,
            ticketIssuedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        console.log(
          `Ticket already issued for ${checkoutRequestID}`
        );

        return {
          ticketId: approvedPaymentData.ticketId,
          ticketCode: approvedPaymentData.ticketCode || null,
          alreadyIssued: true,
        };
      }

      if (paymentData.ticketIssued && paymentData.ticketId) {
        transaction.set(approvedPaymentRef, {
          checkoutRequestID,
          ticketId: paymentData.ticketId,
          ticketCode: paymentData.ticketCode || null,
          receipt,
          approvedAt:
            FieldValue.serverTimestamp(),
        });

        return {
          ticketId: paymentData.ticketId,
          ticketCode: paymentData.ticketCode || null,
          alreadyIssued: true,
        };
      }

      transaction.set(ticketRef, {
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
        scanAttempts: 0,
        scannedAt: null,
        scannedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(paymentRef, {
        ticketIssued: true,
        ticketId: ticketRef.id,
        ticketCode,
        ticketIssuedAt:
          FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(approvedPaymentRef, {
        checkoutRequestID,
        ticketId: ticketRef.id,
        ticketCode,
        receipt,
        approvedAt:
          FieldValue.serverTimestamp(),
      });

      return {
        ticketId: ticketRef.id,
        ticketCode,
        alreadyIssued: false,
      };
    });

    console.log(
      result.alreadyIssued
        ? `Ticket was already issued for ${checkoutRequestID}`
        : `Ticket issued successfully: ${result.ticketCode}`
    );

    return result;

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
