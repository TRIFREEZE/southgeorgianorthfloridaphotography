import { about } from "@/content/about";
import { experiencePrep, experienceSteps, processHeadline } from "@/content/experience";
import { blocksToText, journalPosts, textToBlocks, type JournalPost } from "@/content/journal";
import { services, type Service } from "@/content/services";
import { site } from "@/content/site";
import { defaultStory, type StoryContent } from "@/content/story";

/**
 * Every piece of editable site text, shown in /admin → Pricing & text → Page text.
 * The defaults are the site's original copy; a saved value overrides it, and an
 * empty box falls back to the original. Nothing here needs a database change:
 * all overrides live in the `texts` content row as key → text.
 *
 * Lists use one line per item. Paragraphs are separated by a blank line.
 * `{price}`-style placeholders are filled in automatically where noted.
 */
export interface TextField {
  key: string;
  label: string;
  group: string;
  multiline?: boolean;
  hint?: string;
  default: string;
}

const ONE_PER_LINE = "One per line.";
const PARAS = "Separate paragraphs with a blank line.";

function f(group: string, key: string, label: string, def: string, opts: { multiline?: boolean; hint?: string } = {}): TextField {
  return { group, key, label, default: def, multiline: opts.multiline ?? def.length > 90, hint: opts.hint };
}

/* ------------------------------------------------------------------ structured content → fields */

const NICE: Record<string, string> = {
  name: "Name",
  navLabel: "Menu label",
  headline: "Headline",
  intro: "Intro",
  idealFor: "Great for",
  timing: "Time & pace",
  cta: "Button",
  seoTitle: "Search engine title",
  seoDescription: "Search engine description",
  title: "Title",
  body: "Text",
  short: "Short version",
  items: "Points",
  label: "Label",
  line: "Description",
  tip: "Prep tip",
  noun: "Card title words",
};

/** Fields that are structure, not words. */
const SKIP = new Set(["slug", "id", "n", "category", "bookingCategory", "booking", "pricingMode", "pkg", "href", "faqs", "howItWorks"]);

const human = (k: string) => NICE[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Walk an object of copy and produce one field per string (lists of strings become one field). */
export function fieldsFrom(prefix: string, group: string, value: unknown, label = ""): TextField[] {
  if (typeof value === "string") return [f(group, prefix, label, value)];
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string")) return [f(group, prefix, `${label} (one per line)`, value.join("\n"), { multiline: true, hint: ONE_PER_LINE })];
    return value.flatMap((v, i) => fieldsFrom(`${prefix}.${i + 1}`, group, v, `${label} ${i + 1}`.trim()));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => (SKIP.has(k) ? [] : fieldsFrom(`${prefix}.${k}`, group, v, label ? `${label} · ${human(k)}` : human(k))));
  }
  return [];
}

/** The same walk, returning a copy with any saved overrides applied. */
export function withTexts<T>(value: T, prefix: string, texts: Record<string, string>): T {
  const get = (k: string) => {
    const v = texts[k];
    return v !== undefined && v.trim() !== "" ? v : undefined;
  };
  const walk = (v: unknown, p: string): unknown => {
    if (typeof v === "string") return get(p) ?? v;
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x === "string")) {
        const o = get(p);
        return o ? o.split("\n").map((x) => x.trim()).filter(Boolean) : v;
      }
      return v.map((x, i) => walk(x, `${p}.${i + 1}`));
    }
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SKIP.has(k) ? x : walk(x, `${p}.${k}`)]));
    return v;
  };
  return walk(value, prefix) as T;
}

/* ------------------------------------------------------------------ the registry */

const trust = [
  { title: "Relaxed sessions", body: "Portraits aren't run on a stopwatch." },
  { title: "Clear photo counts", body: "Know exactly how many finished photos you get." },
  { title: "Transparent pricing", body: "Real prices on the site, quotes in writing." },
  { title: "People, pets & businesses", body: "Families, horses, dogs, weddings, brands." },
];

const SITE = "Whole site: header, footer & taglines";
const HOME = "Homepage";
const ABOUT = "About page";
const PORT = "Portfolio pages";
const SVC = "Services page (the list)";
const SVC_ALL = "Every service page (shared wording)";
const PRICE = "Pricing page";
const EXP = "Our approach page";
const BOOK = "Book page & thank-you page";
const CONTACT = "Contact page";
const FAQ = "FAQ page";
const JOURNAL = "Journal (list page)";
const STORY = "Build your story";
const LOC = "Service area page";

export const TEXT_FIELDS: TextField[] = [
  // Whole site
  f(SITE, "site.primaryLine", "Main tagline (footer, About, thank-you page)", site.primaryLine),
  f(SITE, "site.secondaryLine", "Second tagline (under the homepage photo)", site.secondaryLine),
  f(SITE, "site.description", "Search engine description for the homepage", site.description),
  f(SITE, "site.bookCta", "“Book” button in the header & footer", site.bookCta.label),
  ...fieldsFrom("site.nav", SITE, site.nav.map((n) => ({ label: n.label })), "Menu item"),
  f(SITE, "site.footer.blurb", "Footer: about line", `Natural-light photography for people, animals, celebrations and businesses across ${site.region}.`),
  f(SITE, "site.footer.sessions", "Footer: sessions heading", "Sessions"),
  f(SITE, "site.footer.where", "Footer: area heading", "Where we work"),
  f(SITE, "site.footer.farther", "Footer: travel line", "Farther away? Travel is quoted up front."),
  f(SITE, "site.footer.hello", "Footer: contact heading", "Say hello"),
  f(SITE, "site.footer.rights", "Footer: copyright line", "Photographs are the property of their creator."),
  f(SITE, "site.outsideArea", "Travel note for places outside the area", site.serviceArea.outsideAreaNote),
  f(SITE, "delivery.turnaround", "Gallery delivery time", site.turnaroundCopy ?? site.provisionalTurnaroundCopy, { hint: "Shown on pricing and Our approach." }),

  // Homepage
  f(HOME, "home.hero.eyebrow", "Hero: small heading (SEO line)", site.seoHeadline),
  f(HOME, "home.hero.headline", "Hero: big headline", "The good moments deserve more than a timer.", { hint: "The last word is styled in clay italic." }),
  f(HOME, "home.hero.rotate", "Hero: words that take turns as the last word (one per line)", "timer", {
    multiline: true,
    hint: "The headline's last word cycles through these, in order. Put the word from your headline first. Leave just one word to turn cycling off.",
  }),
  f(
    HOME,
    "home.hero.lede",
    "Hero: paragraph",
    "South Georgia & North Florida photography for the people, animals, and stories you love. Portraits, families, pets, horses, weddings and businesses, priced by the photos you take home, not the minutes on a clock.",
  ),
  f(HOME, "home.hero.cta1", "Hero: main button", "See the photography"),
  f(HOME, "home.hero.cta2", "Hero: second button", "Book a session"),
  f(HOME, "home.hero.price", "Hero: starting price line", "Portrait sessions from {price}.", { hint: "{price} becomes your lowest package price. Shown once prices are marked final." }),
  ...fieldsFrom("home.trust", HOME, trust, "Highlights strip"),
  f(HOME, "home.work.eyebrow", "Selected work: small heading", "Selected work"),
  f(HOME, "home.work.title", "Selected work: heading", "Real moments. Beautifully kept."),
  f(HOME, "home.work.cta", "Selected work: button", "See the full portfolio"),
  f(HOME, "home.promise.eyebrow", "Promise: small heading", "The unhurried promise"),
  f(HOME, "home.promise.title", "Promise: heading", "You book the photographs,"),
  f(HOME, "home.promise.accent", "Promise: heading (italic part)", "not a stopwatch."),
  f(HOME, "home.promise.cta", "Promise: link", "How a session works"),
  f(HOME, "home.choose.eyebrow", "Choose your story: small heading", "Choose your story"),
  f(HOME, "home.choose.title", "Choose your story: heading", "Who are we photographing?"),
  f(HOME, "home.choose.lede", "Choose your story: line", "Every kind of session, the same unhurried care."),
  f(HOME, "home.pricing.eyebrow", "Pricing preview: small heading", "Straightforward pricing"),
  f(HOME, "home.pricing.lede", "Pricing preview: paragraph", "Portrait packages are priced by finished photos. Weddings, events and business work are quoted for exactly what you need."),
  f(HOME, "home.pricing.cta", "Pricing preview: link", "Full pricing & inclusions"),
  f(HOME, "home.pricing.help", "Pricing preview: help line", "Not sure?"),
  f(HOME, "home.pricing.helpLink", "Pricing preview: help link", "We'll help you choose."),
  f(HOME, "home.timeline.eyebrow", "How it works: small heading", "How it works"),
  f(HOME, "home.timeline.title", "How it works: heading", processHeadline),
  f(HOME, "home.meet.eyebrow", "Meet the founders: small heading", "Meet the founders"),
  f(HOME, "home.meet.cta", "Meet the founders: button", "Our story"),
  f(HOME, "home.bys.title", "Build your story: heading", "Picture it first."),
  f(HOME, "home.journal.eyebrow", "Journal: small heading", "From the journal"),
  f(HOME, "home.journal.title", "Journal: heading", "Useful, honest notes before your session."),
  f(HOME, "home.journal.cta", "Journal: link", "All journal posts"),
  f(HOME, "home.reviews.eyebrow", "Testimonials: small heading", "Kind words"),
  f(HOME, "home.reviews.title", "Testimonials: heading", "From people we've photographed"),
  f(HOME, "home.areas.eyebrow", "Where we work: small heading", "Where we work"),
  f(HOME, "home.areas.title", "Where we work: heading", "Rooted in South Georgia & North Florida."),
  f(HOME, "home.areas.nearby", "Where we work: last chip", "and nearby"),
  f(HOME, "home.faq.eyebrow", "FAQ: small heading", "Good questions"),
  f(HOME, "home.faq.title", "FAQ: heading", "Things people ask first."),
  f(HOME, "home.faq.cta", "FAQ: link", "All FAQs"),
  f(HOME, "home.final.eyebrow", "Final call-to-action: small heading", "Start here"),
  f(HOME, "home.final.title", "Final call-to-action: heading", "Let's make something worth keeping."),
  f(
    HOME,
    "home.final.body",
    "Final call-to-action: paragraph",
    "Tell us a little about what you're picturing. You'll hear back from a real person, not an automated booking system. Prefer more guidance? Use the session finder.",
  ),
  f(HOME, "home.final.cta", "Final call-to-action: button", "Find my session"),

  // About
  f(ABOUT, "about.eyebrow", "Small heading", "About"),
  f(ABOUT, "about.lead", "Headline (also on the homepage)", about.lead),
  f(ABOUT, "about.short", "Intro about both of you (also on the homepage)", about.short, { multiline: true }),
  f(ABOUT, "about.foundersTitle", "Founders section: heading", "Meet the founders"),
  f(ABOUT, "about.name", "Founder 1 · Name", about.founders[0].name, { hint: "Shown with the portrait here and on the homepage." }),
  f(ABOUT, "about.role", "Founder 1 · Title", about.founders[0].role),
  f(ABOUT, "about.story", "Founder 1 · Story", about.founders[0].story.join("\n\n"), { multiline: true, hint: PARAS }),
  f(ABOUT, "about.name2", "Founder 2 · Name", about.founders[1].name, { hint: "Shown with the portrait here and on the homepage." }),
  f(ABOUT, "about.role2", "Founder 2 · Title", about.founders[1].role),
  f(ABOUT, "about.story2", "Founder 2 · Story", about.founders[1].story.join("\n\n"), { multiline: true, hint: PARAS }),
  f(ABOUT, "about.photosTitle", "Photo strip: heading", "A few favorites", { hint: "The strip appears once you choose About photos in Site photos." }),
  f(ABOUT, "about.valuesTitle", "How we work: heading", "How we work"),
  ...fieldsFrom("about.values", ABOUT, about.values, "How we work"),
  f(ABOUT, "about.closing", "Closing line", site.primaryLine),
  f(ABOUT, "about.cta1", "Closing: first button", "See the photography"),
  f(ABOUT, "about.cta2", "Closing: second button", "Book a session"),

  // Portfolio
  f(PORT, "portfolio.eyebrow", "Small heading", "Portfolio"),
  f(PORT, "portfolio.title", "Headline", "Real moments, beautifully kept."),
  f(PORT, "portfolio.lede", "Paragraph", "People, animals, celebrations and businesses, photographed in honest light and edited to still look like themselves. Tap any photo to view it larger."),
  f(PORT, "portfolio.all", "“All” filter label", "All work"),
  f(PORT, "portfolio.empty", "Empty category message", "New work for this category is on its way."),
  f(PORT, "portfolio.cta.title", "Bottom box: heading", "Want photos like these?"),
  f(PORT, "portfolio.cta.body", "Bottom box: line", "See what's included and how sessions work."),
  f(PORT, "portfolio.cta.about", "Bottom box: first button", "About these sessions"),
  f(PORT, "portfolio.cta.book", "Bottom box: second button", "Start planning"),

  // Services list
  f(SVC, "services.eyebrow", "Small heading", "Sessions"),
  f(SVC, "services.title", "Headline", "Different stories. One unhurried way of working."),
  f(SVC, "services.lede", "Paragraph", "Portrait and animal sessions are priced by finished photos. Weddings, events and business work are custom quoted with clear coverage and usage."),
  f(SVC, "services.packageLabel", "Label on photo-count services", "Priced by photo count"),
  f(SVC, "services.quoteLabel", "Label on custom-quote services", "Custom quote"),
  f(SVC, "services.explore", "Card link (before the service name)", "Explore"),
  f(SVC, "services.notSure", "Bottom line", "Not sure which fits?"),
  f(SVC, "services.notSureCta", "Bottom button", "Find my session"),

  // Shared service-page wording
  f(SVC_ALL, "service.seeWork", "Second button", "See the work"),
  f(SVC_ALL, "service.greatFor", "“Great for” heading", "Great for"),
  f(SVC_ALL, "service.pace", "“Time & pace” heading", "Time & pace"),
  f(SVC_ALL, "service.howEyebrow", "Steps: small heading", "How it works"),
  f(SVC_ALL, "service.howTitle", "Steps: heading", "Simple, from first note to finished photos."),
  f(SVC_ALL, "service.pricingEyebrow", "Pricing: small heading", "Pricing"),
  f(SVC_ALL, "service.quoteTitle", "Custom quote: heading", "Custom quoted, clearly."),
  f(SVC_ALL, "service.quoteBasis", "Custom quote: list heading", "Your quote is based on:"),
  f(SVC_ALL, "service.packagesLede", "Packages: line", "Choose how many finished photos you'd like. Extra photos are {extraPrice} each.", { hint: "{extraPrice} is filled in from your pricing." }),
  f(SVC_ALL, "service.faqTitle", "Questions: heading", "Questions about {service}", { hint: "{service} becomes the service's menu label." }),

  // Each service's own words are edited with its category (/admin → Categories).

  // Pricing page
  f(PRICE, "pricing.eyebrow", "Small heading", "Pricing"),
  f(PRICE, "pricing.lede", "Paragraph", "Intentionally accessible pricing for portraits, families, pets and horses, built around how many finished photos you'd like rather than how many minutes we shoot."),
  f(PRICE, "pricing.extraTitle", "Box: extra photos heading", "Extra photos"),
  f(PRICE, "pricing.travelTitle", "Box: travel heading", "Travel"),
  f(PRICE, "pricing.deliveryTitle", "Box: delivery heading", "Delivery"),
  f(PRICE, "pricing.unhurried.eyebrow", "Dark panel: small heading", "About “no stopwatch”"),
  f(PRICE, "pricing.unhurried.title", "Dark panel: heading", "What unhurried actually means."),
  f(PRICE, "pricing.custom.title", "Custom work: heading", "Custom-quoted sessions"),
  f(PRICE, "pricing.custom.lede", "Custom work: paragraph", "These are custom quoted, in writing, before you commit to anything. We'll never promise unlimited coverage or squeeze a wedding into a portrait price."),
  f(PRICE, "pricing.faqTitle", "Questions: heading", "Pricing questions"),
  f(PRICE, "pricing.help", "Questions: help line", "Still unsure?"),
  f(PRICE, "pricing.helpLink", "Questions: help link", "We'll help you choose."),

  // Our approach
  f(EXP, "experience.eyebrow", "Small heading", "Our approach"),
  f(EXP, "experience.title", "Headline", processHeadline),
  f(EXP, "experience.lede", "Paragraph", "Good photographs come from people feeling at ease. Everything about how we work is built around giving you the time and calm to get there."),
  ...fieldsFrom("experience.steps", EXP, experienceSteps, "Step"),
  f(EXP, "experience.time.eyebrow", "Dark panel: small heading", "On time"),
  f(EXP, "experience.time.title", "Dark panel: heading", "We have time."),
  f(EXP, "experience.prep.title", "What to expect: heading", "What to expect"),
  ...fieldsFrom("experience.prep", EXP, experiencePrep, "What to expect column"),
  f(EXP, "experience.faqTitle", "Questions: heading", "Common worries, answered"),
  f(EXP, "experience.cta", "Questions: button", "Start planning"),

  // Book & thanks
  f(BOOK, "book.eyebrow", "Small heading", "Book a session"),
  f(BOOK, "book.title", "Headline", "Let's plan something worth keeping."),
  f(BOOK, "book.lede", "Paragraph", "Use the session finder for a live estimate, or just send a quick note. Either way, a real person replies, and nothing is booked or charged until we've agreed on the details."),
  f(BOOK, "book.other.label", "Session finder: “something else” choice", "Something else"),
  f(BOOK, "book.other.hint", "Session finder: “something else” hint", "Tell us your idea"),
  f(BOOK, "book.quickPrompt", "Line under the headline", "Already know what you want?"),
  f(BOOK, "book.quickLink", "Line under the headline: link", "Send a quick inquiry"),
  f(BOOK, "book.quick.eyebrow", "Quick inquiry: small heading", "Option B"),
  f(BOOK, "book.quick.title", "Quick inquiry: heading", "Quick inquiry"),
  f(BOOK, "book.quick.body", "Quick inquiry: line", "Name, email, a sentence about your idea. That's it."),
  f(BOOK, "thanks.eyebrow", "Thank-you page: small heading", "Inquiry received"),
  f(BOOK, "thanks.title", "Thank-you page: headline", "Thank you. Your note arrived."),
  f(
    BOOK,
    "thanks.body",
    "Thank-you page: paragraph",
    "A real person will read it and reply personally, usually with a couple of questions and availability. This isn't a confirmed booking yet: nothing is reserved or charged until we've agreed on the details together.",
  ),
  f(BOOK, "thanks.email", "Thank-you page: email note", "If you gave an email address, a copy of this confirmation is on its way (check spam just in case)."),
  f(BOOK, "thanks.cta1", "Thank-you page: first button", "Browse the portfolio"),
  f(BOOK, "thanks.cta2", "Thank-you page: second button", "Read a prep guide"),

  // Contact
  f(CONTACT, "contact.eyebrow", "Small heading", "Contact"),
  f(CONTACT, "contact.title", "Headline", "Say hello."),
  f(CONTACT, "contact.lede", "Paragraph", "Questions, ideas, a date you're holding? Send a note and you'll hear back from a real person.", { multiline: true }),
  f(CONTACT, "contact.submit", "Form button", "Send message"),
  f(CONTACT, "contact.direct", "Side: direct heading", "Direct"),
  f(CONTACT, "contact.whereTitle", "Side: area heading", "Where we work"),
  f(CONTACT, "contact.where", "Side: area text", `${site.region}. Sessions happen on location: homes, farms, parks, venues and businesses. There's no public studio.`),
  f(CONTACT, "contact.follow", "Side: social heading", "Follow along"),
  f(CONTACT, "contact.readyTitle", "Side: planning heading", "Ready to plan?"),
  f(CONTACT, "contact.ready", "Side: planning text", "The session finder gives you a live estimate first."),
  f(CONTACT, "contact.readyLink", "Side: planning link", "Open the session finder"),

  // FAQ page
  f(FAQ, "faq.eyebrow", "Small heading", "FAQ"),
  f(FAQ, "faq.title", "Headline", "Good questions, honest answers."),
  f(FAQ, "faq.topic.session", "Section: sessions", "Sessions"),
  f(FAQ, "faq.topic.pricing", "Section: pricing", "Pricing & travel"),
  f(FAQ, "faq.topic.animals", "Section: animals", "Pets & horses"),
  f(FAQ, "faq.topic.events", "Section: events", "Weddings & events"),
  f(FAQ, "faq.topic.delivery", "Section: delivery", "Your photos"),
  f(FAQ, "faq.topic.rights", "Section: rights", "Rights & printing"),
  f(FAQ, "faq.more", "Bottom line", "Didn't see your question?"),
  f(FAQ, "faq.moreCta", "Bottom button", "Ask us directly"),

  // Journal list
  f(JOURNAL, "journal.eyebrow", "Small heading", "Journal"),
  f(JOURNAL, "journal.title", "Headline", "Notes from behind the camera."),
  f(JOURNAL, "journal.lede", "Paragraph", "Useful guides before your session, and stories from real shoots once clients say we can share them."),

  // Service area
  f(LOC, "locations.eyebrow", "Small heading", "Service area"),
  f(LOC, "locations.title", "Headline", "South Georgia & North Florida, and the back roads in between."),
  f(LOC, "locations.lede", "Paragraph", `We photograph across ${site.region}. These are the towns at the heart of where we work.`),
  f(LOC, "locations.travelTitle", "Travel: heading", "Travel, honestly"),
  f(LOC, "locations.cta", "Travel: button", "Ask about your location"),

  // Story builder
  f(STORY, "story.eyebrow", "Small heading", "Build your story · optional"),
  f(
    STORY,
    "story.lede",
    "Paragraph",
    "Four quick choices and we'll sketch your session: the feel, a suggested package with honest pricing, travel, and one prep tip. Takes about 30 seconds. Or skip it and",
  ),
  f(STORY, "story.skipLink", "Paragraph: link at the end", "just ask a human"),
  f(STORY, "story.q1", "Question 1", "1. Who or what do you love?"),
  f(STORY, "story.q2", "Question 2", "2. What should it feel like?"),
  f(STORY, "story.q3", "Question 3", "3. Roughly where and when?"),
  f(STORY, "story.q4", "Question 4", "4. Any photos that inspire you?"),
  f(STORY, "story.button", "Button", "Show my session story"),
  f(STORY, "story.hint", "Hint under the button", "Pick a subject and a feeling to continue."),
  f(STORY, "story.cardEyebrow", "Card: small heading", "Your session story"),
  f(STORY, "story.cardCta", "Card: button", "Plan this session"),
  // The choices themselves are edited in /admin → Build your story.

  // Journal posts
  ...journalPosts.flatMap((p) => [
    f(`Journal post: ${p.title.slice(0, 48)}${p.title.length > 48 ? "…" : ""}`, `journal.${p.slug}.title`, "Title", p.title),
    f(`Journal post: ${p.title.slice(0, 48)}${p.title.length > 48 ? "…" : ""}`, `journal.${p.slug}.description`, "Summary (also for search engines)", p.description, { multiline: true }),
    f(`Journal post: ${p.title.slice(0, 48)}${p.title.length > 48 ? "…" : ""}`, `journal.${p.slug}.body`, "Article", blocksToText(p.body), {
      multiline: true,
      hint: "Blank line between paragraphs. Start a line with “## ” for a heading, “### ” for a smaller heading, “- ” for a bullet, “> ” for a note.",
    }),
  ]),
];

/** The words of a service (headline/intro keep their original keys). */
function serviceCopy(s: Service) {
  return { name: s.name, navLabel: s.navLabel, headline: s.headline, intro: s.intro, idealFor: s.idealFor, timing: s.timing, cta: s.cta, seoTitle: s.seoTitle, seoDescription: s.seoDescription };
}

export const TEXT_DEFAULTS: Record<string, string> = Object.fromEntries(TEXT_FIELDS.map((x) => [x.key, x.default]));

/** Text lookup with the original copy as a fallback, plus simple {placeholder} filling. */
export function textOf(texts: Record<string, string>, key: string, vars?: Record<string, string>) {
  const v = texts[key];
  let out = v !== undefined && v.trim() !== "" ? v : (TEXT_DEFAULTS[key] ?? "");
  if (vars) for (const [k, x] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, x);
  return out;
}

export type T = ((key: string, vars?: Record<string, string>) => string) & {
  lines: (key: string) => string[];
  paras: (key: string) => string[];
  texts: Record<string, string>;
};

export function makeT(texts: Record<string, string>): T {
  const t = ((key: string, vars?: Record<string, string>) => textOf(texts, key, vars)) as T;
  t.lines = (key) =>
    textOf(texts, key)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  t.paras = (key) =>
    textOf(texts, key)
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  t.texts = texts;
  return t;
}

/* ------------------------------------------------------------------ content with edits applied */

/** The original services with older Page-text edits applied (the fallback layer under each category's own settings). */
export function editedServices(texts: Record<string, string>): Service[] {
  return services.map((s) => {
    const copy = withTexts(serviceCopy(s), `services.${s.slug}`, texts);
    return { ...s, ...copy, howItWorks: withTexts(s.howItWorks, `services.${s.slug}.steps`, texts) };
  });
}


export const editedExperience = (texts: Record<string, string>) => ({
  steps: withTexts(experienceSteps, "experience.steps", texts),
  prep: withTexts(experiencePrep, "experience.prep", texts),
});

export const editedAboutValues = (texts: Record<string, string>) => withTexts(about.values, "about.values", texts);
export const editedTrust = (texts: Record<string, string>) => withTexts(trust, "home.trust", texts);
export const editedNav = (texts: Record<string, string>) => site.nav.map((n, i) => ({ ...n, label: textOf(texts, `site.nav.${i + 1}.label`) }));

export function editedStory(texts: Record<string, string>): StoryContent {
  return {
    subjects: withTexts(defaultStory.subjects, "story.subjects", texts),
    feelings: withTexts(defaultStory.feelings, "story.feelings", texts),
    seasons: withTexts(defaultStory.seasons, "story.seasons", texts),
  };
}

export function editedPost(texts: Record<string, string>, p: JournalPost): JournalPost {
  const body = texts[`journal.${p.slug}.body`];
  return {
    ...p,
    title: textOf(texts, `journal.${p.slug}.title`),
    description: textOf(texts, `journal.${p.slug}.description`),
    body: body && body.trim() ? textToBlocks(body) : p.body,
  };
}

export const STORY_LABEL_KEYS = ["eyebrow", "lede", "skipLink", "q1", "q2", "q3", "q4", "button", "hint", "cardEyebrow", "cardCta"] as const;
export type StoryLabels = Record<(typeof STORY_LABEL_KEYS)[number], string>;
export const storyLabels = (texts: Record<string, string>) => Object.fromEntries(STORY_LABEL_KEYS.map((k) => [k, textOf(texts, `story.${k}`)])) as StoryLabels;
