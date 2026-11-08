/**
 * City pages are deliberately OFF until each one has genuinely local value:
 * real photos made there, favorite (permitted) shoot settings, travel notes and
 * FAQs specific to that town. Google treats near-identical city pages as doorway
 * spam, and visitors can tell, too.
 *
 * To launch a city page: fill in its fields with true, local information, add
 * photos in /admin with that town as the location, and set `published: true`.
 * Unpublished pages return 404 and stay out of the sitemap.
 */
export interface LocationPage {
  slug: string;
  town: string;
  state: "GA" | "FL";
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  /** Real, permitted settings you've photographed at. Check permits/rules first. */
  favoriteSettings: { name: string; note: string }[];
  travelNote: string;
  faqs: { q: string; a: string }[];
  /** Must match the `location` text on published photos to show a local gallery. */
  photoLocationMatch: string;
}

const draft = (slug: string, town: string, state: "GA" | "FL"): LocationPage => ({
  slug,
  town,
  state,
  published: false,
  seoTitle: `${town}, ${state} Photographer | Southstill`,
  seoDescription: `Unhurried portrait, pet, horse, wedding and business photography in and around ${town}, ${state === "GA" ? "Georgia" : "Florida"}.`,
  intro: "",
  favoriteSettings: [],
  travelNote: "",
  faqs: [],
  photoLocationMatch: town,
});

export const locationPages: LocationPage[] = [
  draft("moultrie-ga", "Moultrie", "GA"),
  draft("thomasville-ga", "Thomasville", "GA"),
  draft("tallahassee-fl", "Tallahassee", "FL"),
  draft("valdosta-ga", "Valdosta", "GA"),
  draft("monticello-fl", "Monticello", "FL"),
];

export const publishedLocations = () => locationPages.filter((l) => l.published && l.intro.trim().length > 0);
export const locationBySlug = (slug: string) => locationPages.find((l) => l.slug === slug);
