/**
 * Flick's voice: cute, observant, dry, a little mischievous, and chatty.
 * Never salesy, never fake urgency, never pretends to be the photographer.
 */
export type LineContext =
  | "general"
  | "portfolio"
  | "pricing"
  | "animals"
  | "people"
  | "events"
  | "brands"
  | "book"
  | "journal"
  | "about"
  | "faq"
  | "lost";

export type LineEvent =
  | "photo-click"
  | "photo-hover"
  | "photo-favorite"
  | "card-pick"
  | "inspect"
  | "found"
  | "clicked"
  | "dragged"
  | "wake"
  | "cta"
  | "help-error"
  | "help-hesitate"
  | "celebrate-booking"
  | "celebrate-story"
  | "welcome-back"
  | "scroll-bottom"
  | "fast-scroll";

export type AnticLine = "tidy-start" | "tidy-done" | "shine" | "hammer-start" | "hammer-oops" | "hammer-fixed";

export const ambient: Record<LineContext, string[]> = {
  general: [
    "we have time.",
    "i'm mostly lens.",
    "i live here. rent's wild.",
    "no timer here, by the way.",
    "you're still scrolling? respect.",
    "i promise not to photobomb.",
    "i'd frame that.",
    "honest light. honest prices. i checked.",
    "tap me if you've got a question. i know things. some things.",
    "i dust this whole site every morning. it's a lot of pixels.",
    "fun fact: i've never once said 'cheese'.",
    "golden hour is my favorite hour. the other 23 are fine.",
    "if i blink, that's me taking a picture. kidding. mostly.",
    "everything here is real. except the samples. those say sample.",
    "i'm the only lens on staff with feet.",
  ],
  portfolio: [
    "that light? ridiculous.",
    "i was admiring the composition.",
    "oh, this one's good.",
    "tap one. they get bigger. it's my favorite trick.",
    "you can save favorites with the heart. i won't tell.",
    "every one of these took patience. and snacks.",
  ],
  pricing: [
    "the photographs matter. the stopwatch doesn't.",
    "8, 20 or 40. pick your story size.",
    "real prices. no fine-print gymnastics.",
    "the middle one's the recommended start. i'd pick it. i'm biased.",
    "weddings get a real quote. no $149 weddings. i asked.",
  ],
  animals: [
    "good dogs don't need to sit.",
    "horses usually ignore my directions.",
    "muddy paws welcome.",
    "treats are a legitimate lighting tool.",
    "i once got sniffed by a horse. 10/10 experience.",
  ],
  people: [
    "you can bring your entire personality.",
    "awkward lasts about five minutes. promise.",
    "hold still. actually don't.",
    "kids running off is a pose. trust me.",
  ],
  events: [
    "portraits get no stopwatch. events get agreed hours. fair's fair.",
    "you enjoy the day. we'll keep the moments.",
    "i'd cry at your wedding. i'm a very emotional lens.",
  ],
  brands: ["look like the business you're building.", "no stock-photo handshakes. promise.", "your logo is safe with me. i polish it."],
  book: [
    "take your time. no countdown here either.",
    "a real human reads every one of these.",
    "rough ideas are perfectly good ideas.",
    "i'll stay out of the way while you type. scout's honor.",
    "nothing's booked until a human says so. no surprises.",
  ],
  journal: ["good tips. i've read them. twice.", "bug spray before, not during. learned that one myself.", "reading is very relaxing for a lens."],
  about: ["i've seen the camera bag. it's very organized.", "a creator first. a very patient one.", "we're coworkers. i handle morale."],
  faq: ["good questions down here.", "if it's not answered, tap me. or ask a human."],
  lost: ["this page wandered off. i brought a map.", "i'd ask for directions, but i'm a lens."],
};

export const reactions: Record<LineEvent, string[]> = {
  "photo-click": ["oh, this one's good.", "*snap.* kept that one.", "i'd frame that.", "that light? ridiculous.", "ooh, big version. classy."],
  "photo-hover": ["good eye.", "that one's a favorite.", "look at that light.", "click it. go on."],
  "photo-favorite": ["excellent taste.", "saved. i'd have picked that one too.", "good eye. annoyingly good."],
  "card-pick": ["nice choice.", "ooh. good one.", "solid pick.", "yes. that."],
  inspect: ["i was admiring the composition.", "look at that light.", "hm. yes. very framed."],
  found: ["you found me.", "okay, you win this round."],
  clicked: ["oh! hi.", "you found me.", "that tickles. lens-wise."],
  dragged: ["wheee. okay, here's fine.", "new spot. i approve.", "i can fly, you know. but thanks."],
  wake: ["i wasn't sleeping. i was exposing slowly.", "mm? oh, you're back."],
  cta: ["that button looks important.", "that one's the good button.", "psst. that's where the magic starts."],
  "help-error": ["stuck? a sentence or two is plenty.", "no essays required. the basics are perfect.", "if forms aren't your thing, email works too."],
  "help-hesitate": ["no wrong answers here. a rough idea is plenty.", "take your time. nothing's booked until a human says so."],
  "celebrate-booking": ["it's in! a real human reads these.", "sent! that's the hard part done."],
  "celebrate-story": ["now that's a story worth keeping.", "i can already see the light."],
  "welcome-back": ["oh hey, you're back!", "welcome back. i kept it tidy for you.", "hi again. i missed you. professionally."],
  "scroll-bottom": ["you made it to the bottom. that's commitment.", "end of the page. want to say hi? the button's right there."],
  "fast-scroll": ["whoa. slow down, there's good stuff up there.", "wheee."],
};

export const anticLines: Record<AnticLine, string[]> = {
  "tidy-start": ["one sec. smudge.", "hold on, dust."],
  "tidy-done": ["spotless.", "much better."],
  shine: ["shiny.", "polished."],
  "hammer-start": ["just a tiny adjustment…", "a little tap should do it."],
  "hammer-oops": ["oops.", "…oh."],
  "hammer-fixed": ["fixed. nobody saw that.", "good as new."],
};

/** Commentary when a section heading scrolls into view (matched by keywords). */
export const sectionComments: { match: RegExp; lines: string[] }[] = [
  { match: /pric|stopwatch|cost/i, lines: ["real prices, right here.", "the photographs matter. the stopwatch doesn't. i wrote that. no i didn't."] },
  { match: /photographing|choose your story/i, lines: ["people, pets, weddings, businesses. we do all of it.", "pick one. or all four, i'm not your boss."] },
  { match: /selected work|real moments/i, lines: ["the good stuff.", "these are my favorites. don't tell the others."] },
  { match: /planning|how it works|posing/i, lines: ["four steps. zero stopwatches.", "easy, right?"] },
  { match: /creator|photographer|meet/i, lines: ["that's my coworker. very talented. slightly obsessed with light."] },
  { match: /picture it|build your story/i, lines: ["try this one. it's fun. i helped.", "four taps and i'll sketch your session."] },
  { match: /question|faq|ask/i, lines: ["good questions down here.", "and if yours isn't here, tap me."] },
  { match: /worth keeping|start here/i, lines: ["this is the good part.", "a real person reads these. i've checked."] },
  { match: /rooted|where we work|area/i, lines: ["south georgia and north florida. my favorite map."] },
  { match: /journal|notes/i, lines: ["prep tips. very useful. i read them twice."] },
];

export function contextFor(pathname: string): LineContext {
  if (pathname.startsWith("/portfolio/animals") || pathname.startsWith("/services/pets-horses")) return "animals";
  if (pathname.startsWith("/portfolio/people") || pathname.startsWith("/services/portraits-families")) return "people";
  if (pathname.startsWith("/portfolio/weddings-events") || pathname.startsWith("/services/weddings-events")) return "events";
  if (pathname.startsWith("/portfolio/brands") || pathname.startsWith("/services/business-branding")) return "brands";
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/book") || pathname.startsWith("/contact")) return "book";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/faq")) return "faq";
  return "general";
}

/** Picks a line not yet shown this session (falls back to repeats once a bank is exhausted). */
export function pickLine(pool: string[], shown: Set<string>, rand: () => number = Math.random) {
  const fresh = pool.filter((l) => !shown.has(l));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rand() * from.length)] ?? null;
}
