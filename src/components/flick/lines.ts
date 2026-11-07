/**
 * Flick's voice: cute, observant, dry, a little mischievous. Never salesy,
 * never urgent, never pretends to be the photographer.
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
  | "lost";

export type LineEvent =
  | "photo-click"
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
  | "celebrate-story";

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
  ],
  portfolio: ["that light? ridiculous.", "i was admiring the composition.", "oh, this one's good.", "tap one. they get bigger. it's my favorite trick."],
  pricing: ["the photographs matter. the stopwatch doesn't.", "8, 20 or 40. pick your story size.", "real prices. no fine-print gymnastics."],
  animals: ["good dogs don't need to sit.", "horses usually ignore my directions.", "muddy paws welcome.", "treats are a legitimate lighting tool."],
  people: ["you can bring your entire personality.", "awkward lasts about five minutes. promise.", "hold still. actually don't."],
  events: ["portraits get no stopwatch. events get agreed hours. fair's fair.", "you enjoy the day. we'll keep the moments."],
  brands: ["look like the business you're building.", "no stock-photo handshakes. promise."],
  book: ["take your time. no countdown here either.", "a real human reads every one of these.", "rough ideas are perfectly good ideas."],
  journal: ["good tips. i've read them. twice.", "bug spray before, not during. learned that one myself."],
  about: ["i've seen the camera bag. it's very organized.", "a creator first. a very patient one."],
  lost: ["this page wandered off. i brought a map.", "i'd ask for directions, but i'm a lens."],
};

export const reactions: Record<LineEvent, string[]> = {
  "photo-click": ["oh, this one's good.", "*snap.* kept that one.", "i'd frame that.", "that light? ridiculous."],
  "photo-favorite": ["excellent taste.", "saved. i'd have picked that one too.", "good eye. annoyingly good."],
  "card-pick": ["nice choice.", "ooh. good one.", "solid pick."],
  inspect: ["i was admiring the composition.", "look at that light.", "hm. yes. very framed."],
  found: ["you found me.", "okay, you win this round."],
  clicked: ["oh! hi.", "you found me.", "that tickles. lens-wise."],
  dragged: ["wheee. okay, here's fine.", "new spot. i approve."],
  wake: ["i wasn't sleeping. i was exposing slowly.", "mm? oh, you're back."],
  cta: ["that button looks important."],
  "help-error": ["stuck? a sentence or two is plenty.", "no essays required. the basics are perfect.", "if forms aren't your thing, email works too."],
  "help-hesitate": ["no wrong answers here. a rough idea is plenty.", "take your time. nothing's booked until a human says so."],
  "celebrate-booking": ["it's in. a real human reads these.", "sent! that's the hard part done."],
  "celebrate-story": ["now that's a story worth keeping.", "i can already see the light."],
};

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
  return "general";
}

/** Picks a line not yet shown this session (falls back to repeats once a bank is exhausted). */
export function pickLine(pool: string[], shown: Set<string>, rand: () => number = Math.random) {
  const fresh = pool.filter((l) => !shown.has(l));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rand() * from.length)] ?? null;
}
