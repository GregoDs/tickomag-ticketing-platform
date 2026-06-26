const { db } = require("./firestore.service");
const { generateTicketCode } = require("../utils/generateTicketCode");
const { generateScanToken } = require("../utils/generateScanToken");

async function confirmPayment({ phone, amount, receipt, eventId }) {
  try {
    // 1. Find pending payment
    const paymentsRef = db.collection("payments");

    const snapshot = await paymentsRef
      .where("phone", "==", phone)
      .where("eventId", "==", eventId)
      .where("status", "==", "pending")
      .get();

    if (snapshot.empty) {
      console.log("No pending payment found");
      return;
    }

    snapshot.forEach(async (doc) => {
      const paymentData = doc.data();

      // 2. Generate ticket details
      const ticketCode = generateTicketCode();
      const scanToken = generateScanToken();

      // 3. Create ticket
      await db.collection("tickets").add({
        phone,
        eventId,
        amount,
        receipt,
        ticketCode,
        scanToken,
        status: "active",
        createdAt: new Date()
      });

      // 4. Update payment as completed
      await doc.ref.update({
        status: "paid",
        receipt,
        paidAt: new Date()
      });
    });

  } catch (error) {
    console.error("Ticket creation error:", error);
  }
}

module.exports = {
  confirmPayment
};