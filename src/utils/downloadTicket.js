const escapeXml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const splitText = (value = "", maxLength = 28) => {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
};

const formatDate = (value) => {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const safeFilename = (value = "ticket") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "ticket";

function normalizeQrSvg(qrSvgElement) {
  if (!qrSvgElement) return "";

  const clone = qrSvgElement.cloneNode(true);
  clone.setAttribute("x", "95");
  clone.setAttribute("y", "92");
  clone.setAttribute("width", "250");
  clone.setAttribute("height", "250");
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");

  return clone.outerHTML;
}

export function downloadTicketSvg(ticket, qrSvgElement) {
  const qrSvg = normalizeQrSvg(qrSvgElement);
  const eventTitle = ticket.event?.title || "Event ticket";
  const eventLines = splitText(eventTitle, 20);
  const attendeeName = `${ticket.attendee?.firstName || ""} ${ticket.attendee?.lastName || ""}`.trim() || "Ticket holder";
  const ticketName = `${ticket.ticket?.name || "Admission"} x ${ticket.quantity || 1}`;
  const filename = `${safeFilename(ticket.ticketCode || eventTitle)}.svg`;

  const eventText = eventLines
    .map((line, index) => `<text x="48" y="${406 + index * 36}" class="title">${escapeXml(line)}</text>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="440" height="860" viewBox="0 0 440 860">
  <style>
    .label{font:700 10px Arial,sans-serif;letter-spacing:2px;fill:#77766f;text-transform:uppercase}
    .value{font:700 18px Arial,sans-serif;fill:#111}
    .small{font:700 13px Arial,sans-serif;fill:#605f59}
    .title{font:900 34px Arial,sans-serif;letter-spacing:-1px;fill:#111}
    .code{font:700 18px monospace;letter-spacing:2px;fill:#4d5700}
  </style>
  <rect width="440" height="860" fill="#f4f3ed"/>
  <path d="M0 32 C24 8 48 56 72 32 S120 8 144 32 S192 56 216 32 S264 8 288 32 S336 56 360 32 S408 8 440 32 L440 0 L0 0 Z" fill="#111"/>
  <path d="M42 370 H398" stroke="#c8c6bd" stroke-width="2" stroke-dasharray="8 10"/>
  <circle cx="42" cy="370" r="18" fill="#111"/>
  <circle cx="398" cy="370" r="18" fill="#111"/>
  <rect x="72" y="68" width="296" height="296" fill="#fff"/>
  ${qrSvg || `<text x="220" y="220" text-anchor="middle" class="small">QR unavailable</text>`}
  <text x="220" y="40" text-anchor="middle" class="label" fill="#f4f3ed">Cut here</text>
  <text x="48" y="404" class="label">TickoMag presents</text>
  ${eventText}
  <text x="48" y="536" class="label">Date</text>
  <text x="48" y="562" class="value">${escapeXml(formatDate(ticket.event?.date))}</text>
  <text x="48" y="612" class="label">Venue</text>
  <text x="48" y="638" class="value">${escapeXml(ticket.event?.venue || "Venue to be announced")}</text>
  <text x="48" y="688" class="label">Ticket</text>
  <text x="48" y="714" class="value">${escapeXml(ticketName)}</text>
  <text x="48" y="764" class="label">Attendee</text>
  <text x="48" y="790" class="value">${escapeXml(attendeeName)}</text>
  <text x="220" y="832" text-anchor="middle" class="code">${escapeXml(ticket.ticketCode || "")}</text>
</svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
