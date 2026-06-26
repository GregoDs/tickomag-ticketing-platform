const { stkPush } = require("../services/mpesa.service");
const { db } = require("../services/firebase.service");

async function initiateStkPush(req, res) {
  let paymentRef = null;

  try {
    const {
      phone,
      amount,
      accountReference,
      attendee = {},
      event = {},
      ticket = {},
      quantity = 1,
      total,
    } = req.body;

    if (!phone || !amount || !accountReference) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Send STK Push FIRST
    const response = await stkPush(
      phone,
      amount,
      accountReference
    );

    const checkoutRequestID =
      response.CheckoutRequestID;

    // Create payment document using checkoutRequestID as document ID
    paymentRef = db
      .collection("mpesaPayments")
      .doc(checkoutRequestID);

    await paymentRef.set({
      checkoutRequestID,
      merchantRequestID:
        response.MerchantRequestID || null,
      phone,
      amount,
      total: Number(total ?? amount),
      attendee,
      event,
      ticket,
      quantity: Number(quantity),
      eventId: event.id || "masquerade_mku_2026",
      merchantAccount: accountReference,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "STK Push initiated",
      data: response
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

    return res.status(500).json({
      success: false,
      message: "STK Push failed",
      error: error.message
    });
  }
}

module.exports = {
  initiateStkPush
};
