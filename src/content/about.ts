/**
 * About page + "Meet the founders" (homepage). These are the ORIGINAL defaults:
 * everything here is edited in /admin → Pricing & text → All site text → About page,
 * and both portraits in /admin → Site photos → About page.
 * Never add credentials, years of experience, awards or client counts that
 * aren't real.
 */
export const about = {
  lead: "Two founders, one unhurried way of working.",
  /** Short version used at the top of /about and on the homepage. */
  short:
    "Making things people keep is what we love most. We take on photography sessions because we genuinely enjoy them, not to fill a quota, so we can keep rates accessible and give every session our full attention.",
  founders: [
    {
      name: "",
      role: "Founder",
      /** Each string is a paragraph. Keep it true. */
      story: [
        "I spend my working life making things for screens: planning, shooting, editing and figuring out what makes people stop and feel something. Photography is where that work slows down and turns into something you can hold.",
        "I take on sessions because I love doing it. That's also why our rates are intentionally accessible and why we don't run portraits on a stopwatch. I'd rather take the time to get a handful of photographs exactly right than rush to the next appointment.",
      ],
    },
    {
      name: "",
      role: "Founder",
      story: [
        "This is where your story goes: what drew you to photography, what you love to photograph, and what you bring to a session. Write it in your own words in /admin → All site text → About page.",
      ],
    },
  ],
  values: [
    { title: "Unhurried", body: "Portrait sessions are planned around finished photos, not minutes." },
    { title: "Honest", body: "Clear pricing, clear scope, and no promises we can't keep." },
    { title: "Natural", body: "Real light, real expressions and edits that still look like you." },
  ],
  /** Set true when the About text has been rewritten/approved by the owners. */
  confirmed: false,
};

/** True while the second founder's story is still the placeholder above. */
export const FOUNDER2_PLACEHOLDER = about.founders[1].story.join("\n\n");
