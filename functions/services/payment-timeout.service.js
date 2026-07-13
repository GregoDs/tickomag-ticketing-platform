const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("./firebase.service");

const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 10;
const PAYMENT_TIMEOUT_BATCH_SIZE = 100;

function getPaymentTimeoutMinutes() {
  const configuredMinutes = Number(process.env.MPESA_PAYMENT_TIMEOUT_MINUTES);

  if (Number.isFinite(configuredMinutes) && configuredMinutes > 0) {
    return configuredMinutes;
  }

  return DEFAULT_PAYMENT_TIMEOUT_MINUTES;
}

async function markTimedOutPayments() {
  const timeoutMinutes = getPaymentTimeoutMinutes();
  const now = new Date();
  const snapshot = await db
    .collection("mpesaPayments")
    .where("status", "==", "pending")
    .where("timeoutAt", "<=", now)
    .orderBy("timeoutAt")
    .limit(PAYMENT_TIMEOUT_BATCH_SIZE)
    .get();

  const updates = snapshot.docs.map((paymentDoc) =>
    db.runTransaction(async (transaction) => {
      const callbackRef = db
        .collection("mpesaCallbacks")
        .doc(paymentDoc.id);
      const freshPaymentDoc = await transaction.get(paymentDoc.ref);
      const callbackDoc = await transaction.get(callbackRef);
      if (!freshPaymentDoc.exists) return false;

      const paymentData = freshPaymentDoc.data();
      if (paymentData.status !== "pending") return false;
      if (paymentData.callbackReceivedAt) return false;
      if (callbackDoc.exists) return false;

      const timeoutAt = paymentData.timeoutAt;

      transaction.update(paymentDoc.ref, {
        status: "timed_out",
        timeoutAt,
        timeoutMinutes,
        timedOutAt: FieldValue.serverTimestamp(),
        timeoutReason: "No M-Pesa callback received before timeout.",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    })
  );

  const results = await Promise.all(updates);
  const timedOutCount = results.filter(Boolean).length;

  if (timedOutCount > 0) {
    console.log(`Marked ${timedOutCount} M-Pesa payment(s) as timed_out.`);
  }

  return {
    checked: snapshot.size,
    timedOut: timedOutCount,
  };
}

module.exports = {
  getPaymentTimeoutMinutes,
  markTimedOutPayments,
};
