const DEFAULT_CALLBACK_URL =
  "https://api-spenbqlbqq-uc.a.run.app/api/mpesa/callback";

module.exports = {
  baseUrl: "https://api.safaricom.co.ke",
  consumerKey: process.env.MPESA_PROD_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_PROD_CONSUMER_SECRET,
  shortcode: process.env.MPESA_PROD_SHORTCODE,
  masqueradeTill: process.env.MPESA_PROD_MASQUERADETILL,
  passkey: process.env.MPESA_PROD_PASSKEY,
  callbackUrl: process.env.MPESA_PROD_CALLBACK_URL ||
    process.env.MPESA_CALLBACK_URL ||
    DEFAULT_CALLBACK_URL,
};
