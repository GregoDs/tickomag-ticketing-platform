const axios = require("axios");
const https = require("https");
const config = require("../config");

const MPESA_REQUEST_TIMEOUT_MS = 15000;
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const httpsAgent = new https.Agent({ keepAlive: true });
let cachedAccessToken = null;
let accessTokenExpiresAt = 0;
let accessTokenRequest = null;

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

// Create Access token function OAUTH
async function getAccessToken() {
  assertMpesaConfig();

  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) {
    return cachedAccessToken;
  }

  if (accessTokenRequest) {
    return accessTokenRequest;
  }

  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");


  accessTokenRequest = axios.get(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      httpsAgent,
      timeout: MPESA_REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  ).then((response) => {
    const expiresInSeconds = Number(response.data.expires_in || 3600);
    cachedAccessToken = response.data.access_token;
    accessTokenExpiresAt =
      Date.now() + (expiresInSeconds * 1000) - TOKEN_EXPIRY_BUFFER_MS;
    return cachedAccessToken;
  }).finally(() => {
    accessTokenRequest = null;
  });

  return accessTokenRequest;
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


// Create stk push function...call daraja
async function stkPush(phone, amount, accountReference) {
  const token = await getAccessToken();
  const timestamp = getMpesaTimestamp();

  const password = Buffer.from(
    config.shortcode + config.passkey + timestamp
  ).toString("base64");

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: config.masqueradeTill,
    PhoneNumber: phone,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: "Ticket Payment",
  };

console.log("STK Payload:");
console.log(payload);

  const response = await axios.post(
    `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      httpsAgent,
      timeout: MPESA_REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

console.log("Safaricom STK Response:");

console.log(response.data);

  return response.data;
}

module.exports = {
  getAccessToken,
  stkPush,
};
