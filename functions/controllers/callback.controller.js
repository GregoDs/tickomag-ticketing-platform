const ticketService = require("../services/ticket.service");
const { db } = require("../services/firebase.service");

async function mpesaStkCallback(req, res) {
  try {

    console.log(
      "========== CALLBACK RECEIVED =========="
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );

    const stkCallback =
      req.body?.Body?.stkCallback;

    // Respond immediately to Safaricom
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

    if (!stkCallback) {
      console.log("Invalid callback payload");
      return;
    }

    const checkoutRequestID =
      stkCallback.CheckoutRequestID;

    const merchantRequestID =
      stkCallback.MerchantRequestID;

    const resultCode =
      stkCallback.ResultCode;

    const resultDesc =
      stkCallback.ResultDesc;

    // Direct document lookup
    const paymentRef = db
      .collection("mpesaPayments")
      .doc(checkoutRequestID);

    const paymentDoc =
      await paymentRef.get();

    if (!paymentDoc.exists) {
      console.log(
        `Payment not found for ${checkoutRequestID}`
      );
      return;
    }

    // PAYMENT FAILED
    if (resultCode !== 0) {

      await paymentRef.update({
        status: "failed",
        failureCode: resultCode,
        failureReason: resultDesc,
        merchantRequestID,
        updatedAt: new Date()
      });

      console.log("Payment failed:", {
        checkoutRequestID,
        resultCode,
        resultDesc
      });

      return;
    }

    // SUCCESS PAYMENT
    const items =
      stkCallback.CallbackMetadata?.Item || [];

    const amount =
      items.find(
        item => item.Name === "Amount"
      )?.Value;

    const receipt =
      items.find(
        item => item.Name === "MpesaReceiptNumber"
      )?.Value;

    const transactionDate =
      items.find(
        item => item.Name === "TransactionDate"
      )?.Value;

    const phone =
      items.find(
        item => item.Name === "PhoneNumber"
      )?.Value;

    const balance =
      items.find(
        item => item.Name === "Balance"
      )?.Value;

    await paymentRef.update({
      status: "paid",
      amountPaid: amount,
      mpesaReceiptNumber: receipt,
      mpesaTransactionDate: transactionDate,
      balance: balance ?? null,
      paidPhone: phone,
      merchantRequestID,
      resultCode,
      resultDesc,
      paidAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Payment Success:", {
      checkoutRequestID,
      merchantRequestID,
      phone,
      amount,
      receipt,
      balance,
      transactionDate
    });

    await ticketService.confirmPayment({
      paymentId: checkoutRequestID,
      checkoutRequestID,
      receipt,
      amount,
      phone
    });

  } catch (error) {
    console.error(
      "Callback Error:",
      error
    );
  }
}

module.exports = {
  mpesaStkCallback
};