import type { Photo } from "@/lib/photo-types";

/**
 * Labeled placeholders shown ONLY until real, owner-approved photos are
 * published in /admin. They render as abstract art plates with a visible
 * "Sample" label: never stock photography, never presented as client work.
 */
type Seed = [id: string, category: string | null, subcategory: string, title: string, w: number, h: number, tone: number];

const seeds: Seed[] = [
  ["sample-hero", "people", "Families", "Your hero photograph goes here", 3, 2, 0],
  ["sample-family-1", "people", "Families", "Family session placeholder", 4, 5, 1],
  ["sample-couple-1", "people", "Couples", "Couples session placeholder", 3, 2, 2],
  ["sample-senior-1", "people", "Seniors", "Senior portrait placeholder", 2, 3, 3],
  ["sample-maternity-1", "people", "Maternity", "Maternity placeholder", 4, 5, 4],
  ["sample-horse-1", "animals", "Horses", "Horse portrait placeholder", 3, 2, 5],
  ["sample-dog-1", "animals", "Dogs", "Dog portrait placeholder", 4, 5, 6],
  ["sample-equestrian-1", "animals", "Equestrian", "Horse and rider placeholder", 2, 3, 7],
  ["sample-farm-1", "animals", "Farm animals", "Farm animal placeholder", 1, 1, 8],
  ["sample-wedding-1", "weddings-events", "Weddings", "Wedding placeholder", 3, 2, 9],
  ["sample-engagement-1", "weddings-events", "Engagements", "Engagement placeholder", 4, 5, 10],
  ["sample-event-1", "weddings-events", "Milestones", "Celebration placeholder", 3, 2, 11],
  ["sample-brand-1", "brands", "Personal brands", "Personal brand placeholder", 4, 5, 12],
  ["sample-team-1", "brands", "Team photos", "Team portrait placeholder", 3, 2, 13],
  ["sample-product-1", "brands", "Products", "Product placeholder", 1, 1, 14],
  ["sample-founder", null, "Founder", "Your portrait goes here", 4, 5, 15],
  ["sample-founder-2", null, "Founder", "Second founder's portrait goes here", 4, 5, 2],
];

export const samplePhotos: Photo[] = seeds.map(([id, category, subcategory, title, w, h, tone], i) => ({
  id,
  src: null,
  width: w * 600,
  height: h * 600,
  category,
  subcategory,
  title,
  alt: `Sample placeholder: ${title.toLowerCase()}. Replace with an original photograph in the admin.`,
  location: null,
  focalX: 50,
  focalY: 50,
  sortOrder: i,
  featured: i < 8 && category !== null,
  hero: id === "sample-hero",
  isSample: true,
  tone,
}));
