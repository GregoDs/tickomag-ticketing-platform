const axios = require("axios");
const config = require("../config");

function assertMpesaConfig() {
  const requiredConfig = [
    ["consumerKey", config.consumerKey],
    ["consumerSecret", config.consumerSecret],
    ["shortcode", config.shortcode],
    ["passkey", config.passkey],
    ["callbackUrl", config.callbackUrl],
  ];

  const missing = requiredConfig
    .filter(([, value]) => !value || value === "N/A")
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing M-Pesa config: ${missing.join(", ")}`);
  }

  if (!/^https:\/\//.test(config.callbackUrl)) {
    throw new Error("MPESA_CALLBACK_URL must be a public HTTPS URL");
  }

  if (!/^\d+$/.test(String(config.shortcode))) {
    throw new Error("MPESA_SHORTCODE must be numeric");
  }
}

// Create Access token function
async function getAccessToken() {
  assertMpesaConfig();

  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  const response = await axios.get(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
  
  return response.data.access_token;
}

function getMpesaTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}


// Create stk push function
async function stkPush(phone, amount, accountReference) {
  const token = await getAccessToken();
  const timestamp = getMpesaTimestamp();

  // DEBUG LOGS

  console.log("Shortcode:", config.shortcode);

  console.log("Passkey:", config.passkey);

  console.log("Callback URL:", config.callbackUrl);

  console.log("Timestamp:", timestamp);

  console.log(

    "Password Source:",

    config.shortcode + config.passkey + timestamp

  );

  const password = Buffer.from(
    config.shortcode + config.passkey + timestamp
  ).toString("base64");

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: config.shortcode,
    PhoneNumber: phone,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: "Ticket Payment",
  };

  const response = await axios.post(
    `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

module.exports = {
  getAccessToken,
  stkPush,
};
