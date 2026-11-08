/**
 * Journal posts. Write them in plain TypeScript blocks: no CMS subscription needed.
 * Publish only original, genuinely helpful posts. Shoot stories should use real
 * sessions you have permission to share (add their photos in /admin and reference
 * the photo IDs in `photoIds`).
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "note"; text: string };

export interface JournalPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  category: "Guide" | "Story" | "Behind the scenes";
  readingMinutes: number;
  published: boolean;
  /** Optional: IDs of published portfolio photos to show with the post. */
  photoIds?: string[];
  coverCategory: "people" | "animals" | "weddings-events" | "brands";
  body: Block[];
}

export const journalPosts: JournalPost[] = [
  {
    slug: "what-to-wear-family-photos-south-georgia",
    title: "What to wear for family photos in South Georgia (when it's still 88° in October)",
    description:
      "Practical outfit advice for family portraits in South Georgia and North Florida heat and humidity: colors, fabrics, layers, and what to leave at home.",
    date: "2026-11-01",
    category: "Guide",
    readingMinutes: 5,
    published: true,
    coverCategory: "people",
    body: [
      {
        type: "p",
        text: "The best outfit for family photos is the one nobody has to think about once the session starts. Around here, that mostly means planning for heat, humidity and bugs as much as for color.",
      },
      { type: "h2", text: "Start with one person, then build around them" },
      {
        type: "p",
        text: "Pick the outfit you love most first, often Mom's dress or a favorite shirt, and pull two or three colors from it for everyone else. Coordinated beats matching. Five identical white shirts tend to flatten a family into one shape.",
      },
      { type: "h2", text: "Colors that love warm Southern light" },
      {
        type: "ul",
        items: [
          "Earthy tones: rust, olive, cream, camel, denim, soft terracotta",
          "One or two deeper anchors: navy, forest, burgundy or chocolate",
          "Small, quiet patterns are fine. Big logos and neon steal attention from faces",
          "Bright white in harsh sun can glare. Ivory and oatmeal are kinder",
        ],
      },
      { type: "h2", text: "Fabrics for humidity" },
      {
        type: "p",
        text: "Linen, cotton and loose knits breathe and move. Stiff polyester shows sweat and wrinkles fast. Dresses and skirts with some movement look lovely in a breeze, and they let you sit in grass without fuss.",
      },
      { type: "h2", text: "Shoes, layers and the small stuff" },
      {
        type: "ul",
        items: [
          "Wear shoes you can actually walk a field in. Bring cute ones to swap into",
          "Light layers like a cardigan or an open button-down add variety without changing outfits",
          "Pack water, wipes, a lint roller, bug spray (apply before we start, not during) and a snack for little ones",
          "Hair ties and a small comb solve most humidity emergencies",
        ],
      },
      {
        type: "note",
        text: "Booked a session? You'll get a short wardrobe guide with your confirmation, and you can send outfit options for a second opinion.",
      },
    ],
  },
  {
    slug: "how-to-prepare-your-horse-for-a-portrait-session",
    title: "How to prepare your horse for a portrait session",
    description:
      "A calm, safety-first checklist for equestrian portraits: grooming, tack, timing, handlers and what to expect on the day.",
    date: "2026-10-20",
    category: "Guide",
    readingMinutes: 6,
    published: true,
    coverCategory: "animals",
    body: [
      {
        type: "p",
        text: "Horse portraits are one part photography and three parts horsemanship. A relaxed horse in good light beats a perfectly turned-out horse who's had enough. Here's how to set your session up for the first kind.",
      },
      { type: "h2", text: "The week before" },
      {
        type: "ul",
        items: [
          "Trim bridle path, whiskers (if you normally do) and fetlocks a few days ahead, so edges look natural rather than freshly clipped",
          "Clean and condition tack you want photographed. Leather glows on camera when it's cared for",
          "Think about a halter vs. bridle look. A clean leather halter is classic and comfortable",
          "Line up a handler your horse trusts. You can't hold the lead and be in the photo at the same time",
        ],
      },
      { type: "h2", text: "The day of" },
      {
        type: "ul",
        items: [
          "Bathe the day before if possible. Same-day baths can leave coats flat and horses fidgety",
          "Fly spray before we start, and bring the bottle",
          "Hoof oil, a soft brush, a towel and treats your horse actually works for",
          "Turn out or longe beforehand if your horse is fresh. A little tired is a good thing",
        ],
      },
      { type: "h2", text: "Timing and location" },
      {
        type: "p",
        text: "Early morning or the last hour or two before sunset gives the softest light and the coolest temperatures. Avoid feeding time and hay delivery chaos. Familiar ground with good footing is almost always better than an unfamiliar scenic spot.",
      },
      { type: "h2", text: "Safety always wins" },
      {
        type: "p",
        text: "We'll never ask for anything your horse isn't comfortable with. No unusual props flapping near their face, no standing in unsafe spots for a better angle. If your horse is stressed, we pause. If needed, we come back another day.",
      },
      {
        type: "note",
        text: "Planning a horse-and-rider session? Mention your horse's age, temperament and any spooks when you inquire so we can plan the setup.",
      },
    ],
  },
  {
    slug: "pet-photography-with-energetic-dogs",
    title: "Pet photography with energetic dogs: why we don't make them sit",
    description:
      "How relaxed, movement-friendly pet sessions work for high-energy dogs, plus what to bring and how to help.",
    date: "2026-10-05",
    category: "Guide",
    readingMinutes: 4,
    published: true,
    coverCategory: "animals",
    body: [
      {
        type: "p",
        text: "If your dog has never held a sit-stay longer than a heartbeat, good news: we don't need one. Energetic dogs make some of the most joyful portraits. You just have to photograph them as they are.",
      },
      { type: "h2", text: "Work with the energy" },
      {
        type: "ul",
        items: [
          "A short play or walk first takes the edge off",
          "Running, mid-shake and tongue-out moments are often the keepers",
          "Calm portraits come later, once they've explored and settled",
        ],
      },
      { type: "h2", text: "What to bring" },
      {
        type: "ul",
        items: [
          "High-value treats in small pieces, plus their favorite toy (squeakers are gold)",
          "A clean leash and collar or harness. We can minimize the leash in editing if it's safe to use one",
          "Water and a bowl, especially in summer",
          "A second person if your dog is a runner",
        ],
      },
      { type: "h2", text: "Where it works best" },
      {
        type: "p",
        text: "Somewhere safe, legal for dogs and not packed with distractions. A quiet corner of a park, your yard or a friend's farm all work well. We'll talk through options when you book, and check leash rules for public spaces.",
      },
    ],
  },
];

export const publishedPosts = () =>
  journalPosts.filter((p) => p.published).sort((a, b) => b.date.localeCompare(a.date));
export const postBySlug = (slug: string) => journalPosts.find((p) => p.slug === slug && p.published);

/**
 * Plain-text article format used by the dashboard editor:
 *   ## Heading      ### Smaller heading      - bullet      > Note
 * Paragraphs are separated by a blank line.
 */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.type === "h2") return `## ${b.text}`;
      if (b.type === "h3") return `### ${b.text}`;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
      if (b.type === "note") return `> ${b.text}`;
      return b.text;
    })
    .join("\n\n");
}

export function textToBlocks(text: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: "p", text: para.join(" ") });
    if (list.length) out.push({ type: "ul", items: list });
    para = [];
    list = [];
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (para.length) flush();
      list.push(bullet[1]);
      continue;
    }
    if (list.length) flush();
    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flush();
      out.push({ type: heading[1] === "##" ? "h2" : "h3", text: heading[2] });
    } else if (line.startsWith("> ")) {
      flush();
      out.push({ type: "note", text: line.slice(2) });
    } else para.push(line);
  }
  flush();
  return out;
}
