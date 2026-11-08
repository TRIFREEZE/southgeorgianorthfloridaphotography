import { about } from "@/content/about";
import { processHeadline } from "@/content/experience";
import { services } from "@/content/services";
import { site } from "@/content/site";

/**
 * Every piece of page text editable from /admin → Content → Page text.
 * The defaults are the site's original copy; editing one stores an override.
 */
export interface TextField {
  key: string;
  label: string;
  group: string;
  multiline?: boolean;
  hint?: string;
  default: string;
}

export const TEXT_FIELDS: TextField[] = [
  // Homepage
  { group: "Homepage", key: "home.utility", label: "Top utility line", default: site.utilityLine },
  { group: "Homepage", key: "home.hero.eyebrow", label: "Hero: small heading (SEO line)", default: site.seoHeadline },
  { group: "Homepage", key: "home.hero.headline", label: "Hero: big headline", hint: "The last word is styled in clay italic.", default: "The good moments deserve more than a timer." },
  {
    group: "Homepage",
    key: "home.hero.lede",
    label: "Hero: paragraph",
    multiline: true,
    default:
      "South Georgia & North Florida photography for the people, animals, and stories you love. Portraits, families, pets, horses, weddings and businesses, priced by the photos you take home, not the minutes on a clock.",
  },
  { group: "Homepage", key: "home.hero.cta1", label: "Hero: main button", default: "See the photography" },
  { group: "Homepage", key: "home.hero.cta2", label: "Hero: second button", default: "Book a session" },
  { group: "Homepage", key: "home.work.title", label: "Selected work: heading", default: "Real moments. Beautifully kept." },
  { group: "Homepage", key: "home.promise.title", label: "Promise: heading", default: "You book the photographs," },
  { group: "Homepage", key: "home.promise.accent", label: "Promise: heading (italic part)", default: "not a stopwatch." },
  { group: "Homepage", key: "home.choose.title", label: "Choose your story: heading", default: "Who are we photographing?" },
  { group: "Homepage", key: "home.choose.lede", label: "Choose your story: line", default: "Every kind of session, the same unhurried care." },
  {
    group: "Homepage",
    key: "home.pricing.lede",
    label: "Pricing preview: paragraph",
    multiline: true,
    default: "Portrait packages are priced by finished photos. Weddings, events and business work are quoted for exactly what you need.",
  },
  { group: "Homepage", key: "home.timeline.title", label: "How it works: heading", default: processHeadline },
  { group: "Homepage", key: "home.bys.title", label: "Build your story: heading", default: "Picture it first." },
  { group: "Homepage", key: "home.areas.title", label: "Where we work: heading", default: "Rooted in South Georgia & North Florida." },
  { group: "Homepage", key: "home.faq.title", label: "FAQ: heading", default: "Things people ask first." },
  { group: "Homepage", key: "home.final.title", label: "Final call-to-action: heading", default: "Let's make something worth keeping." },
  {
    group: "Homepage",
    key: "home.final.body",
    label: "Final call-to-action: paragraph",
    multiline: true,
    default:
      "Tell us a little about what you're picturing. You'll hear back from a real person, not an automated booking system. Prefer more guidance? Use the session finder.",
  },

  // About
  { group: "About the photographer", key: "about.name", label: "Your name (optional)", default: about.name },
  { group: "About the photographer", key: "about.role", label: "Role line", default: about.roleLine },
  { group: "About the photographer", key: "about.lead", label: "Headline", default: about.lead },
  { group: "About the photographer", key: "about.short", label: "Short intro (homepage)", multiline: true, default: about.short },
  { group: "About the photographer", key: "about.story", label: "Your story", multiline: true, hint: "Separate paragraphs with a blank line.", default: about.story.join("\n\n") },

  // Pages
  { group: "Other pages", key: "portfolio.title", label: "Portfolio: headline", default: "Real moments, beautifully kept." },
  {
    group: "Other pages",
    key: "portfolio.lede",
    label: "Portfolio: paragraph",
    multiline: true,
    default: "People, animals, celebrations and businesses, photographed in honest light and edited to still look like themselves. Tap any photo to view it larger.",
  },
  {
    group: "Other pages",
    key: "pricing.lede",
    label: "Pricing page: paragraph",
    multiline: true,
    default: "Intentionally accessible pricing for portraits, families, pets and horses, built around how many finished photos you'd like rather than how many minutes we shoot.",
  },
  { group: "Other pages", key: "book.title", label: "Book page: headline", default: "Let's plan something worth keeping." },
  {
    group: "Other pages",
    key: "book.lede",
    label: "Book page: paragraph",
    multiline: true,
    default: "Use the session finder for a live estimate, or just send a quick note. Either way, a real person replies, and nothing is booked or charged until we've agreed on the details.",
  },
  { group: "Other pages", key: "contact.title", label: "Contact: headline", default: "Say hello." },
  { group: "Other pages", key: "contact.lede", label: "Contact: paragraph", multiline: true, default: "Questions, ideas, a date you're holding? Send a note and you'll hear back from a real person." },
  { group: "Other pages", key: "delivery.turnaround", label: "Gallery delivery time", hint: "Shown in FAQs and pricing.", default: site.turnaroundCopy ?? site.provisionalTurnaroundCopy },

  // Services
  ...services.flatMap((s) => [
    { group: "Service pages", key: `services.${s.slug}.headline`, label: `${s.name}: headline`, default: s.headline },
    { group: "Service pages", key: `services.${s.slug}.intro`, label: `${s.name}: intro`, multiline: true, default: s.intro },
  ]),
];

export const TEXT_DEFAULTS: Record<string, string> = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.default]));

/** Text lookup with the original copy as a fallback. */
export function textOf(texts: Record<string, string>, key: string) {
  const v = texts[key];
  return v !== undefined && v.trim() !== "" ? v : (TEXT_DEFAULTS[key] ?? "");
}
