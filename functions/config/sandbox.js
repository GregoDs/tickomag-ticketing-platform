const DEFAULT_CALLBACK_URL =
  "https://api-spenbqlbqq-uc.a.run.app/api/mpesa/callback";

module.exports = {
  baseUrl: "https://sandbox.safaricom.co.ke",
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL || DEFAULT_CALLBACK_URL,
};
