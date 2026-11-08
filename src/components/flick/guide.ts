import { formatPrice, packagePhotos, packagePrice, pricedPackages } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import { experienceSteps } from "@/content/experience";
import { site } from "@/content/site";

/**
 * Ask Flick: a deterministic site guide. Every answer is assembled from the
 * site's own published content (pricing, categories, FAQs and founders come from
 * the CMS at request time). No language model, no invented prices or availability.
 */
export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideAnswer {
  id: string;
  question: string;
  answer: string;
  links?: GuideLink[];
  keywords: string[];
  /** Topic ids worth offering next. */
  followUps?: string[];
}

export interface GuideSession {
  bookingId: string;
  label: string;
  name: string;
  hint: string;
  intro: string;
  href: string | null;
  pricingMode: "package" | "quote";
  packageIds: string[];
  quoteIntro: string;
  /** Extra words people might use for this kind of session. */
  words: string[];
}

export interface GuideData {
  pricing: Pricing;
  faqs: { id: string; q: string; a: string }[];
  sessions: GuideSession[];
  founders: { name: string; role: string }[];
}

export interface Guide {
  topics: GuideAnswer[];
  faqs: GuideAnswer[];
  byId: Map<string, GuideAnswer>;
}

/** Everyday words for the original session types, so "my mare" or "elopement" still lands. */
const SYNONYMS: Record<string, string[]> = {
  people: ["family", "families", "kids", "children", "baby", "newborn", "maternity", "pregnant", "couple", "senior", "graduation", "portrait", "headshot", "individual", "mom", "dad", "grandparents"],
  animals: ["horse", "equestrian", "barn", "rider", "pony", "mare", "gelding", "dog", "cat", "pet", "puppy", "kitten", "animal", "goat", "farm", "chicken", "cow"],
  "weddings-events": ["wedding", "event", "engagement", "elopement", "party", "celebration", "reception", "birthday", "reunion", "anniversary", "shower", "proposal"],
  "business-branding": ["business", "brand", "branding", "headshot", "team", "product", "company", "linkedin", "corporate", "menu", "restaurant", "website", "staff"],
};
/** A few general groups so new categories match the words people really type. */
const WORD_GROUPS = [
  ["car", "cars", "auto", "automotive", "vehicle", "truck", "trucks", "pickup", "jeep", "bike", "bikes", "motorcycle", "motorbike", "harley", "dirtbike", "atv", "classic", "hotrod"],
  ["boat", "boats", "fishing", "lake"],
  ["real", "estate", "house", "home", "listing", "property", "airbnb", "interior"],
  ["food", "restaurant", "menu", "dish", "bakery", "cafe"],
  ["sports", "team", "football", "baseball", "softball", "soccer", "rodeo"],
];

const STOP = new Set(["what", "when", "where", "does", "your", "with", "have", "about", "that", "this", "there", "will", "much", "should", "could", "would", "can", "you", "the", "and", "for", "are", "how", "get", "do", "is", "it", "my", "me", "i", "a", "an", "of", "to", "in", "on", "or", "we", "our", "us", "any", "want", "like", "need", "photo", "photos", "pictures", "picture", "pics", "shoot", "photograph", "photography", "take", "some"]);

/** Lowercase, drop punctuation, and strip simple plurals so "horses" matches "horse". */
export const stem = (w: string) => {
  const x = w.toLowerCase().replace(/[^a-z0-9$]/g, "");
  if (x.length > 4 && x.endsWith("ies")) return `${x.slice(0, -3)}y`;
  if (x.length > 3 && x.endsWith("es") && /(ch|sh|x|ss)es$/.test(x)) return x.slice(0, -2);
  if (x.length > 3 && x.endsWith("s") && !x.endsWith("ss")) return x.slice(0, -1);
  return x;
};
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9$ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem)
    .filter(Boolean);

/** Edit distance with an early exit, for forgiving typos ("weding", "hourse"). */
function close(a: string, b: string) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > 1) return false;
    prev = cur;
  }
  return prev[b.length] <= 1;
}

const sessionWords = (s: Pick<GuideSession, "bookingId" | "label" | "name" | "hint" | "words">) => {
  const own = words(`${s.label} ${s.name} ${s.hint} ${s.words.join(" ")}`).concat(SYNONYMS[s.bookingId] ?? []);
  const groups = WORD_GROUPS.filter((g) => g.some((w) => own.includes(stem(w)))).flat();
  return [...new Set([...own, ...groups].map(stem))];
};

export function buildGuide({ pricing, faqs, sessions, founders }: GuideData): Guide {
  const faqA = (id: string, fallback: string) => faqs.find((f) => f.id === id)?.a ?? fallback;
  const pkgLine = pricing.packages.map((p) => `${p.name}: ${p.photos == null ? packagePhotos(p).toLowerCase() : `${p.photos} edited photos`}, ${packagePrice(p, "quoted personally")}`).join("; ");
  const towns = site.serviceArea.towns.map((t) => `${t.name}, ${t.state}`).join(", ");
  const packaged = sessions.filter((s) => s.pricingMode === "package").map((s) => s.name.toLowerCase());
  const quoted = sessions.filter((s) => s.pricingMode === "quote").map((s) => s.name.toLowerCase());
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  const named = founders.filter((f) => f.name.trim());

  const topics: GuideAnswer[] = [
    {
      id: "cost",
      question: "What does it cost?",
      answer: [
        packaged.length ? `${list(packaged).replace(/^./, (c) => c.toUpperCase())} sessions are priced by finished photos: ${pkgLine}.` : `Packages: ${pkgLine}.`,
        `Extra photos are ${formatPrice(pricing.extraPhoto.priceCents)} each.`,
        quoted.length ? `${list(quoted).replace(/^./, (c) => c.toUpperCase())} get a custom written quote.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      links: [
        { label: "See full pricing", href: "/pricing" },
        { label: "Get a live estimate", href: "/book" },
      ],
      keywords: ["price", "cost", "how much", "rate", "package", "fee", "$", "cheap", "afford", "budget", "pricing", "expensive", "dollar", "charge", "quote"],
      followUps: ["match", "custom", "time", "human"],
    },
    {
      id: "custom",
      question: "What's the Custom package?",
      answer: (() => {
        const c = pricing.packages.find((p) => p.priceCents == null);
        return c ? `${c.name} is for anything bigger or different from the set packages. ${c.summary} You'll get a written quote before you commit to anything.` : "Anything that doesn't fit a package gets a written quote before you commit.";
      })(),
      links: [{ label: "Ask for a quote", href: "/book#quick" }],
      keywords: ["custom", "bigger", "more photos", "bigger package", "different", "special", "unique", "large", "lots"],
      followUps: ["cost", "human"],
    },
    {
      id: "where",
      question: "Where do you work?",
      answer: `Across ${site.region}, centered on ${towns}. ${site.serviceArea.outsideAreaNote}`,
      links: [{ label: "Service area", href: "/locations" }],
      keywords: ["where", "area", "location", "travel", "town", "city", "near", "georgia", "florida", "moultrie", "thomasville", "tallahassee", "valdosta", "monticello", "drive", "far", "come to"],
      followUps: ["cost", "how"],
    },
    {
      id: "how",
      question: "How does a session work?",
      answer: experienceSteps.map((s, i) => `${i + 1}. ${s.title}: ${s.short}`).join(" "),
      links: [{ label: "Our approach", href: "/experience" }],
      keywords: ["process", "steps", "what happens", "expect", "work", "first time", "nervous", "pose", "awkward"],
      followUps: ["time", "delivery", "match"],
    },
    {
      id: "time",
      question: "How long is a session?",
      answer: `${pricing.noStopwatch.body} ${pricing.noStopwatch.boundaries}`,
      keywords: ["long", "time", "minutes", "hour", "rush", "timer", "stopwatch", "duration", "quick"],
      followUps: ["cost", "how"],
    },
    {
      id: "delivery",
      question: "When do I get my photos?",
      answer: faqA("delivery", "Finished photos arrive in a private online gallery. We'll confirm the timing when you book."),
      links: [{ label: "FAQs", href: "/faq" }],
      keywords: ["deliver", "delivery", "gallery", "turnaround", "receive", "edited", "ready", "download", "weeks", "get my", "how soon", "back"],
      followUps: ["cost", "human"],
    },
    {
      id: "who",
      question: "Who's behind the camera?",
      answer: named.length
        ? `${named.map((f) => (f.role ? `${f.name} (${f.role})` : f.name)).join(" and ")}. ${named.length > 1 ? "They run Southstill together" : "That's who runs Southstill"}, at an unhurried pace.`
        : "Southstill is run by two founders who photograph across the region at an unhurried pace.",
      links: [{ label: "Meet the founders", href: "/about" }],
      keywords: ["who", "photographer", "founder", "owner", "about", "team", "you guys", "behind"],
      followUps: ["how", "human"],
    },
    {
      id: "horse",
      question: "Can I bring my horse?",
      answer: faqA("horse", "Yes! Horses are a favorite. We plan around safety, footing and calm handling, with a handler always nearby."),
      links: [{ label: "Horse prep guide", href: "/journal/how-to-prepare-your-horse-for-a-portrait-session" }],
      keywords: ["horse", "equestrian", "barn", "rider", "pony", "mare", "gelding"],
      followUps: ["cost", "match"],
    },
    {
      id: "human",
      question: "Can I talk to a real person?",
      answer: "Always. Send a quick note and a real person replies. Nothing is booked or charged until you've agreed on the details together.",
      links: [
        { label: "Quick inquiry", href: "/book#quick" },
        { label: "Contact", href: "/contact" },
      ],
      keywords: ["human", "person", "talk", "call", "contact", "email", "phone", "real", "help", "speak", "reach"],
      followUps: ["match"],
    },
  ];

  // One answer per session type, built from its own settings, so new categories are answered too.
  for (const s of sessions) {
    const pkgs = pricing.packages.filter((p) => s.packageIds.includes(p.id));
    const cheapest = pricedPackages(pkgs)[0];
    topics.push({
      id: `session-${s.bookingId}`,
      question: `Tell me about ${s.name.toLowerCase()}`,
      answer: `Yes. ${s.intro} ${
        s.pricingMode === "package"
          ? cheapest
            ? `It's priced by finished photos, from ${formatPrice(cheapest.priceCents)}${cheapest.photos ? ` for ${cheapest.photos}` : ""}.`
            : "It's priced by finished photos."
          : s.quoteIntro
      }`.trim(),
      links: [...(s.href ? [{ label: s.name, href: s.href }] : []), { label: "Start booking", href: `/book?category=${s.bookingId}` }],
      keywords: sessionWords(s),
      followUps: s.pricingMode === "package" ? ["cost", "time", "where"] : ["custom", "where", "human"],
    });
  }

  const faqAnswers: GuideAnswer[] = faqs.map((f) => ({
    id: `faq-${f.id}`,
    question: f.q,
    answer: f.a,
    links: [{ label: "All FAQs", href: "/faq" }],
    keywords: words(f.q).filter((w) => w.length > 3),
    followUps: ["human"],
  }));
  const byId = new Map([...topics, ...faqAnswers].map((a) => [a.id, a]));
  return { topics, faqs: faqAnswers, byId };
}

export interface GuideResult {
  best: GuideAnswer | null;
  /** Other close answers, offered as "did you mean…" when the best is unsure or ambiguous. */
  also: GuideAnswer[];
  confident: boolean;
}

/** Keyword scoring with plurals, phrases and small typos. Never guesses: low scores return suggestions instead. */
export function searchGuide(guide: Guide, query: string): GuideResult {
  const q = ` ${query.toLowerCase().replace(/[^a-z0-9$ ]/g, " ").replace(/\s+/g, " ")} `;
  const ws = words(query);
  if (query.trim().length < 2 || (!ws.length && !q.includes("$"))) return { best: null, also: [], confident: false };
  const scored: { a: GuideAnswer; score: number }[] = [];
  for (const a of [...guide.topics, ...guide.faqs]) {
    let score = 0;
    for (const raw of a.keywords) {
      const k = raw.includes(" ") ? raw : stem(raw);
      if (raw.includes(" ")) {
        if (q.includes(` ${raw} `)) score += 3;
      } else if (k === "$") {
        if (q.includes("$")) score += 2;
      } else if (ws.some((w) => w === k)) score += k.length > 4 ? 2 : 1.5;
      else if (ws.some((w) => (w.length > 3 && k.length > 3 && (w.startsWith(k) || k.startsWith(w))) || close(w, k))) score += 1;
    }
    if (a.id.startsWith("faq-")) score *= 0.5; // prefer curated topics; FAQs catch the long tail
    if (score > 0) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score);
  const [top, second] = scored;
  if (!top) return { best: null, also: [], confident: false };
  const confident = top.score >= 1 && (!second || top.score >= second.score * 1.4);
  return { best: top.a, also: scored.slice(1, 4).map((x) => x.a), confident };
}
