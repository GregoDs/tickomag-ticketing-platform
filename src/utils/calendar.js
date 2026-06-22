const icsDate = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeIcs = (value = "") => String(value).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function saveEventToCalendar(event) {
  const start = new Date(event.date);
  const end = new Date(start);

  if (event.endTime) {
    const [hours, minutes] = event.endTime.split(":").map(Number);
    end.setHours(hours, minutes, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
  } else {
    end.setHours(end.getHours() + 4);
  }

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TickoMag//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@tickomag`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description || `${event.category || "Event"} by TickoMag`)}`,
    `LOCATION:${escapeIcs(event.venue)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  link.download = `${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
