import { auth } from "./firebase";
import { FUNCTIONS_API_URL } from "./mpesa.service";

export async function verifyTicket(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Your administrator session has expired.");

  const idToken = await user.getIdToken();
  const eventId = window.localStorage.getItem("tickomag:adminEvent") || "masquerade-2026";
  const response = await fetch(`${FUNCTIONS_API_URL}/tickets/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload, eventId }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "The ticket could not be verified.");
  }

  return result.data;
}
