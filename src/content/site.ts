/**
 * Brand + business facts. Anything marked OWNER must be confirmed before launch —
 * the /admin dashboard lists what's still unconfirmed.
 * Contact details, socials and base city live in environment variables so they
 * can change without touching code (see .env.example).
 */
export const site = {
  name: "Red Clay & Light Photography",
  shortName: "Red Clay & Light",
  primaryLine: "Your moments. Our time. No rush.",
  secondaryLine: "Real moments. Beautifully kept.",
  seoHeadline: "South Georgia & North Florida Photography, Without the Rush.",
  description:
    "Unhurried portraits, families, pets, horses, weddings and business photography throughout South Georgia and North Florida. Explore galleries and straightforward pricing.",
  utilityLine: "South Georgia & North Florida · Natural-light portraits, pets, weddings, businesses",
  region: "South Georgia & North Florida",

  /**
   * OWNER: confirm the towns you actually serve. These drive the footer, the
   * /locations overview and the structured-data `areaServed` list.
   */
  serviceArea: {
    confirmed: false,
    towns: [
      { name: "Moultrie", state: "GA", slug: "moultrie-ga" },
      { name: "Thomasville", state: "GA", slug: "thomasville-ga" },
      { name: "Tallahassee", state: "FL", slug: "tallahassee-fl" },
      { name: "Valdosta", state: "GA", slug: "valdosta-ga" },
      { name: "Monticello", state: "FL", slug: "monticello-fl" },
    ],
    regionsServed: ["South Georgia", "North Florida"],
    outsideAreaNote:
      "Somewhere else? Ask. Other locations are quoted by travel distance, and you'll see the travel cost before you book anything.",
  },

  /** OWNER: set when you've confirmed your standard turnaround. Leave null to show the provisional line. */
  turnaroundCopy: null as string | null,
  provisionalTurnaroundCopy: "We'll confirm your gallery delivery date with you before you book.",

  /** OWNER: real public business facts for structured data. Never publish a home address. */
  business: {
    legalName: null as string | null,
    foundingYear: null as number | null,
  },

  nav: [
    { label: "Portfolio", href: "/portfolio" },
    { label: "Services", href: "/services" },
    { label: "Pricing", href: "/pricing" },
    { label: "Our Approach", href: "/experience" },
    { label: "About", href: "/about" },
  ],
  bookCta: { label: "Book a Session", href: "/book" },
} as const;

export type Town = (typeof site.serviceArea.towns)[number];
