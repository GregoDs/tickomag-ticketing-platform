module.exports = {
    baseUrl: "https://api.safaricom.co.ke",
    consumerKey: process.env.MPESA_PROD_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_PROD_CONSUMER_SECRET,
    shortcode: process.env.MPESA_PROD_SHORTCODE,
    passkey: process.env.MPESA_PROD_PASSKEY,
    callbackUrl: process.env.MPESA_PROD_CALLBACK_URL
  };