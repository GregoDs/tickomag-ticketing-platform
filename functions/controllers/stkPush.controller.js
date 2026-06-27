const { stkPush } = require("../services/mpesa.service");
const { db } = require("../services/firebase.service");
const { getCheckoutQuote } = require("../services/event.service");

async function initiateStkPush(req, res) {
  let paymentRef = null;

  try {
    const {
      phone,
      attendee = {},
      eventId,
      ticketId,
      quantity = 1,
    } = req.body;

    if (!phone || !eventId || !ticketId) {
      return res.status(400).json({
        success: false,
        message: "Phone, eventId and ticketId are required"
      });
    }

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
