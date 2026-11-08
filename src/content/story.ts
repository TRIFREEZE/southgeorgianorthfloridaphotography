import type { PackageId } from "./pricing";
import type { BookingCategory, CategoryId } from "./services";

/** "Build Your Story": the options and the honest rules that turn them into a session card. */

export const storySubjects = [
  { id: "family", label: "My family", category: "people" as CategoryId, booking: "people" as BookingCategory, pkg: "full" as PackageId | null },
  { id: "couple", label: "Us two", category: "people" as CategoryId, booking: "people" as BookingCategory, pkg: "full" as PackageId | null },
  { id: "horse", label: "My horse", category: "animals" as CategoryId, booking: "animals" as BookingCategory, pkg: "full" as PackageId | null },
  { id: "pet", label: "My pet", category: "animals" as CategoryId, booking: "animals" as BookingCategory, pkg: "little" as PackageId | null },
  { id: "wedding", label: "Our wedding or event", category: "weddings-events" as CategoryId, booking: "weddings-events" as BookingCategory, pkg: null },
  { id: "business", label: "My business", category: "brands" as CategoryId, booking: "business-branding" as BookingCategory, pkg: null },
] as const;

export const storyFeelings = [
  { id: "candid", label: "Candid & easy", line: "unposed, in-between moments" },
  { id: "golden", label: "Cinematic golden hour", line: "warm, low evening light" },
  { id: "classic", label: "Classic & timeless", line: "clean, simple frames that age well" },
  { id: "editorial", label: "Bold & editorial", line: "confident composition and contrast" },
  { id: "playful", label: "Playful", line: "movement, laughter and a little chaos" },
] as const;

export const storySeasons = [
  { id: "soon", label: "In the next month or two" },
  { id: "spring", label: "Spring" },
  { id: "summer", label: "Summer" },
  { id: "fall", label: "Fall" },
  { id: "winter", label: "Winter" },
  { id: "unsure", label: "Not sure yet" },
] as const;

export type StorySubjectId = (typeof storySubjects)[number]["id"];
export type StoryFeelingId = (typeof storyFeelings)[number]["id"];
export type StorySeasonId = (typeof storySeasons)[number]["id"];

const tips: Record<StorySubjectId, string> = {
  family: "Pick one outfit you love and pull two or three colors from it for everyone else. Coordinated beats matching.",
  couple: "Plan something to do together, like a walk, a coffee or a slow dance. Doing beats posing every time.",
  horse: "Groom the day before, bring fly spray and a handler your horse trusts. A little tired beats fresh and fizzy.",
  pet: "Bring tiny high-value treats and one squeaky toy. A short walk first takes the edge off.",
  wedding: "Leave buffer time in your timeline for light and a few quiet minutes together. Nobody regrets that.",
  business: "Make a short list of where the photos will live, like your website, socials or print. It shapes the whole shot list.",
};

const nouns: Record<StorySubjectId, string> = {
  family: "family portraits",
  couple: "couple portraits",
  horse: "horse portraits",
  pet: "pet portraits",
  wedding: "celebration",
  business: "brand session",
};

const feelingTips: Record<StoryFeelingId, string> = {
  candid: "We'll keep direction light and let things unfold.",
  golden: "We'll aim for the last hour or so before sunset, weather permitting.",
  classic: "Simple wardrobe and uncluttered settings will keep it timeless.",
  editorial: "Strong shapes and a little contrast in wardrobe help this look sing.",
  playful: "Bring a prop or game that makes your crew laugh.",
};

/** Everything the story builder says. Words are editable in /admin → Page text → Build your story. */
export const defaultStory = {
  subjects: storySubjects.map((x) => ({ ...x, noun: nouns[x.id], tip: tips[x.id] })),
  feelings: storyFeelings.map((x) => ({ ...x, tip: feelingTips[x.id] })),
  seasons: storySeasons.map((x) => ({ ...x })),
};
export type StoryContent = typeof defaultStory;

export function composeStory(input: { subject?: string | null; feeling?: string | null; town?: string | null; season?: string | null }, content: StoryContent = defaultStory) {
  const subject = content.subjects.find((s) => s.id === input.subject) ?? null;
  const feeling = content.feelings.find((f) => f.id === input.feeling) ?? null;
  const season = content.seasons.find((s) => s.id === input.season) ?? null;
  if (!subject || !feeling) return null;
  return {
    subject,
    feeling,
    season,
    town: input.town ?? null,
    tip: `${subject.tip} ${feeling.tip}`,
  };
}

export type ComposedStory = NonNullable<ReturnType<typeof composeStory>>;
