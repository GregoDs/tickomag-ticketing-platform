const DEVELOPMENT_API_URL =
  "/functions-api/tickomag/us-central1/api";

const API_BASE_URL =
  import.meta.env.VITE_MPESA_API_BASE_URL ||
  `${DEVELOPMENT_API_URL}/mpesa`;

export const FUNCTIONS_API_URL =
  import.meta.env.VITE_FUNCTIONS_API_URL ||
  DEVELOPMENT_API_URL;

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "The M-Pesa request failed.");
  }

  return payload;
}

export async function initiateMpesaPayment(order) {
  const response = await fetch(`${API_BASE_URL}/stk-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  return parseResponse(response);
}

export async function getMpesaPaymentStatus(checkoutRequestID) {
  const response = await fetch(
    `${API_BASE_URL}/payment-status/${encodeURIComponent(checkoutRequestID)}`
  );

  return parseResponse(response);
}
