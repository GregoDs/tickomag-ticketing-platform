const { admin, db } = require("./firebase.service");

// Prevent duplicate STK initiation
async function paymentReferenceExists(checkoutRequestID) {
  const snapshot = await db
    .collection("payments")
    .doc(checkoutRequestID)
    .get();

  return snapshot.exists;
}

async function createPaymentReference(checkoutRequestID, data = {}) {
  await db
    .collection("payments")
    .doc(checkoutRequestID)
    .set({
      checkoutRequestID,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...data,
    });
}

// Prevent double ticket issuance
async function approvedPaymentExists(checkoutRequestID) {
  const snapshot = await db
    .collection("approvedPayments")
    .doc(checkoutRequestID)
    .get();

  return snapshot.exists;
}

async function createApprovedPaymentReference(checkoutRequestID, data = {}) {
  await db
    .collection("approvedPayments")
    .doc(checkoutRequestID)
    .set({
      checkoutRequestID,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...data,
    });
}

module.exports = {
  paymentReferenceExists,
  createPaymentReference,
  approvedPaymentExists,
  createApprovedPaymentReference,
};