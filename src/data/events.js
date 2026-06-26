import masqueradeHero from "../assets/masquerade-night.jpg";
import sunsetFrequency from "../assets/events_img/sunset-frequency.avif";
import afterHoursNairobi from "../assets/events_img/nairobi-afterhours.avif";
import vinylandCoffee from "../assets/events_img/vinyl&coffee.avif";
import laughtrack from "../assets/events_img/laughtrack.avif";
import nairobiMarket from "../assets/events_img/nairobi-market.avif";

export const events = [
  {
    id: "masquerade-2026",
    title: "The Masquerade",
    eyebrow: "TickoMag presents",
    description:
      "A night for the bold, the curious and the beautifully disguised. Dress up, disappear into the music, and meet Thika after dark.",
    date: "2026-08-15T19:00:00+03:00",
    endTime: "02:00",
    venue: "The Alchemist, Thika",
    area: "Thika",
    image: masqueradeHero,
    category: "Nightlife",
    priceFrom: 1,
    featured: true,
    tickets: [
      { id: "regular", name: "Regular", price: 1, availability: "available" },
      { id: "gate", name: "GATE", price: 2, availability: "available" },
      { id: "vip", name: "VIP", price: 2, availability: "Sold Out" },
    ],
  },
  {
    id: "sunset-frequency",
    title: "Sunset Frequency",
    date: "2026-07-03T17:30:00+03:00",
    venue: "K1 Klub House",
    area: "Parklands",
    image: sunsetFrequency,
    category: "Live music",
    priceFrom: 800,
    weekend: true,
  },
  {
    id: "nairobi-after-hours",
    title: "Nairobi After Hours",
    date: "2026-07-11T21:00:00+03:00",
    venue: "The Mist",
    area: "Westlands",
    image: afterHoursNairobi,
    category: "Party",
    priceFrom: 1500,
    weekend: true,
  },
  {
    id: "vinyl-and-coffee",
    title: "Vinyl & Coffee",
    date: "2026-07-19T11:00:00+03:00",
    venue: "Baraza Media Lab",
    area: "Kilimani",
    image: vinylandCoffee,
    category: "Culture",
    priceFrom: 500,
  },
  {
    id: "laugh-track-live",
    title: "Laugh Track: Live",
    date: "2026-07-25T19:00:00+03:00",
    venue: "Kenya National Theatre",
    area: "CBD",
    image: laughtrack,
    category: "Comedy",
    priceFrom: 1200,
  },
  {
    id: "made-in-nairobi",
    title: "Made in Nairobi Market",
    date: "2026-08-02T10:00:00+03:00",
    venue: "The Waterfront",
    area: "Karen",
    image: nairobiMarket,
    category: "Market",
    priceFrom: 0,
  },
];
