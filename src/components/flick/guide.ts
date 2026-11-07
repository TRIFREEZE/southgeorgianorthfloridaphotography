import { faqs } from "@/content/faqs";
import { formatPrice, pricing } from "@/content/pricing";
import { experienceSteps } from "@/content/experience";
import { site } from "@/content/site";

/**
 * Ask Flick: a deterministic site guide. Every answer is assembled from the
 * site's own content/config at build time. No language model, no invented
 * prices or availability.
 */
export interface GuideAnswer {
  id: string;
  question: string;
  answer: string;
  links?: { label: string; href: string }[];
  keywords: string[];
}

const pkgLine = pricing.packages.map((p) => `${p.name}: ${p.photos} edited photos for ${formatPrice(p.priceCents)}`).join("; ");
const towns = site.serviceArea.towns.map((t) => `${t.name}, ${t.state}`).join(", ");

export const guideTopics: GuideAnswer[] = [
  {
    id: "cost",
    question: "What does it cost?",
    answer: `Portrait, family, pet and horse sessions are priced by finished photos: ${pkgLine}. Extra photos are ${formatPrice(pricing.extraPhoto.priceCents)} each. Weddings, events and business work get a custom written quote.`,
    links: [
      { label: "See full pricing", href: "/pricing" },
      { label: "Get a live estimate", href: "/book" },
    ],
    keywords: ["price", "cost", "how much", "rate", "package", "fee", "$", "cheap", "afford", "budget", "pricing"],
  },
  {
    id: "where",
    question: "Where do you work?",
    answer: `Across ${site.region}, centered on ${towns}. ${site.serviceArea.outsideAreaNote}`,
    links: [{ label: "Service area", href: "/locations" }],
    keywords: ["where", "area", "location", "travel", "town", "city", "near", "georgia", "florida", "moultrie", "thomasville", "tallahassee", "valdosta", "monticello", "drive"],
  },
  {
    id: "how",
    question: "How does a session work?",
    answer: experienceSteps.map((s, i) => `${i + 1}. ${s.title}: ${s.short}`).join(" "),
    links: [{ label: "Our approach", href: "/experience" }],
    keywords: ["how", "process", "work", "steps", "what happens", "expect", "session"],
  },
  {
    id: "time",
    question: "How long is a session?",
    answer: `${pricing.noStopwatch.body} ${pricing.noStopwatch.boundaries}`,
    keywords: ["long", "time", "minutes", "hour", "rush", "timer", "stopwatch", "duration"],
  },
  {
    id: "weddings",
    question: "Do you do weddings and events?",
    answer: `Yes: weddings, engagements, milestones and community events. ${pricing.custom["weddings-events"].intro}`,
    links: [
      { label: "Weddings & events", href: "/services/weddings-events" },
      { label: "Ask about my date", href: "/book?category=weddings-events" },
    ],
    keywords: ["wedding", "event", "engagement", "elopement", "party", "celebration", "reception", "birthday", "reunion"],
  },
  {
    id: "horse",
    question: "Can I bring my horse?",
    answer: faqs.find((f) => f.id === "horse")!.a,
    links: [
      { label: "Pets & horses", href: "/services/pets-horses" },
      { label: "Horse prep guide", href: "/journal/how-to-prepare-your-horse-for-a-portrait-session" },
    ],
    keywords: ["horse", "equestrian", "barn", "rider", "pony", "mare", "gelding", "farm"],
  },
  {
    id: "pets",
    question: "Do you photograph pets?",
    answer: faqs.find((f) => f.id === "pets-move")!.a,
    links: [{ label: "Pets & horses", href: "/services/pets-horses" }],
    keywords: ["dog", "cat", "pet", "puppy", "animal", "goat"],
  },
  {
    id: "business",
    question: "Business or brand photos?",
    answer: `Yes: personal brands, team headshots, products and small businesses. ${pricing.custom["business-branding"].intro}`,
    links: [{ label: "Business & branding", href: "/services/business-branding" }],
    keywords: ["business", "brand", "headshot", "team", "product", "company", "linkedin", "corporate", "menu"],
  },
  {
    id: "human",
    question: "Can I talk to a real person?",
    answer: "Always. Send a quick note and a real person replies. Nothing is booked or charged until you've agreed on the details together.",
    links: [
      { label: "Quick inquiry", href: "/book#quick" },
      { label: "Contact", href: "/contact" },
    ],
    keywords: ["human", "person", "talk", "call", "contact", "email", "phone", "real", "help"],
  },
];

const faqAnswers: GuideAnswer[] = faqs.map((f) => ({
  id: `faq-${f.id}`,
  question: f.q,
  answer: f.a,
  links: [{ label: "All FAQs", href: "/faq" }],
  keywords: f.q
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3),
}));

const STOP = new Set(["what", "when", "where", "does", "your", "with", "have", "about", "that", "this", "there", "will", "much", "should", "could", "would", "can", "you", "the", "and", "for", "are", "how", "get"]);

/** Simple keyword scoring over the site's own answers. Returns null when unsure. */
export function searchGuide(query: string): GuideAnswer | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;
  const words = q.replace(/[^a-z0-9$ ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  let best: { a: GuideAnswer; score: number } | null = null;
  for (const a of [...guideTopics, ...faqAnswers]) {
    let score = 0;
    for (const k of a.keywords) {
      if (k.includes(" ") ? q.includes(k) : words.some((w) => w === k || (w.length > 3 && (w.startsWith(k) || k.startsWith(w))))) score += k.length > 4 ? 2 : 1;
    }
    if (a.id.startsWith("faq-")) score *= 0.45; // prefer curated topics; FAQs catch the long tail
    if (score > 0 && (!best || score > best.score)) best = { a, score };
  }
  return best && best.score >= 1 ? best.a : null;
}
