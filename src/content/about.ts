/**
 * About page + founder card. OWNER: replace with your own true story.
 * Never add credentials, years of experience, awards or client counts that
 * aren't real. Leave `name` empty to refer to "the photographer".
 *
 * Your portrait is uploaded in /admin (category: "About / founder").
 */
export const about = {
  name: "", // e.g. "Jordan Smith"
  roleLine: "Photographer & creator",
  lead: "I'm a creator by trade, a photographer by choice.",
  /** Short version used on the homepage. */
  short:
    "Making things people keep is what I love most. I take on photography sessions because I genuinely enjoy them, not to fill a quota, so I can keep rates accessible and give every session my full attention.",
  /** Long version for /about. Each string is a paragraph. Keep it true. */
  story: [
    "I spend my working life making things for screens: planning, shooting, editing and figuring out what makes people stop and feel something. Photography is where that work slows down and turns into something you can hold.",
    "I take on sessions because I love doing it. That's also why my rates are intentionally accessible and why I don't run portraits on a stopwatch. I'd rather take the time to get a handful of photographs exactly right than rush to the next appointment.",
    "I work across South Georgia and North Florida: families, couples, seniors, horses and the dogs who run the house, small businesses, and celebrations worth remembering.",
  ],
  values: [
    { title: "Unhurried", body: "Portrait sessions are planned around finished photos, not minutes." },
    { title: "Honest", body: "Clear pricing, clear scope, and no promises we can't keep." },
    { title: "Natural", body: "Real light, real expressions and edits that still look like you." },
  ],
  /** Set true when the story above has been rewritten/approved by the owner. */
  confirmed: false,
};
