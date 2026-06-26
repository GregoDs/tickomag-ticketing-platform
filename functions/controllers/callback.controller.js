const ticketService = require("../services/ticket.service");
const { db } = require("../services/firebase.service");
const { FieldValue } = require("firebase-admin/firestore");

function getCallbackValue(items, name) {
  return items.find(
    item => item.Name === name
  )?.Value;
}

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

    if (!stkCallback) {
      console.log("Invalid callback payload");
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: "Invalid callback payload"
      });
    }

    const checkoutRequestID =
      stkCallback.CheckoutRequestID;

    const merchantRequestID =
      stkCallback.MerchantRequestID;

    const resultCode =
      stkCallback.ResultCode;

    const resultDesc =
      stkCallback.ResultDesc;

    await db
      .collection("mpesaCallbacks")
      .doc(checkoutRequestID)
      .set({
        checkoutRequestID,
        merchantRequestID,
        resultCode,
        resultDesc,
        callbackMetadata:
          stkCallback.CallbackMetadata || null,
        payload: req.body,
        receivedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

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
    }

    // PAYMENT FAILED
    if (resultCode !== 0) {

      await paymentRef.set({
        checkoutRequestID,
        status: "failed",
        failureCode: resultCode,
        failureReason: resultDesc,
        merchantRequestID,
        resultCode,
        resultDesc,
        callbackMetadata:
          stkCallback.CallbackMetadata || null,
        callbackPayload: req.body,
        callbackReceivedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log("Payment failed:", {
        checkoutRequestID,
        resultCode,
        resultDesc
      });

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted"
      });
    }

    // SUCCESS PAYMENT
    const items =
      stkCallback.CallbackMetadata?.Item || [];

    const amount =
      getCallbackValue(items, "Amount");

    const receipt =
      getCallbackValue(items, "MpesaReceiptNumber");

    const transactionDate =
      getCallbackValue(items, "TransactionDate");

    const phone =
      getCallbackValue(items, "PhoneNumber");

    const balance =
      getCallbackValue(items, "Balance");

    await paymentRef.set({
      checkoutRequestID,
      merchantRequestID,
      status: "paid",
      amountPaid: amount,
      mpesaReceiptNumber: receipt,
      mpesaTransactionDate: transactionDate,
      balance: balance ?? null,
      paidPhone: phone,
      resultCode,
      resultDesc,
      callbackMetadata: {
        items,
        raw: stkCallback.CallbackMetadata || null,
      },
      callbackPayload: req.body,
      callbackReceivedAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("Payment Success:", {
      checkoutRequestID,
      merchantRequestID,
      phone,
      amount,
      receipt,
      balance,
      transactionDate
    });

    try {
      await ticketService.confirmPayment({
        paymentId: checkoutRequestID,
        checkoutRequestID,
        receipt,
        amount,
        phone
      });
    } catch (ticketError) {
      console.error(
        "Ticket issue failed after payment update:",
        ticketError
      );
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

  } catch (error) {
    console.error(
      "Callback Error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ResultCode: 1,
        ResultDesc: "Callback processing failed"
      });
    }
  }
}

module.exports = {
  mpesaStkCallback
};
