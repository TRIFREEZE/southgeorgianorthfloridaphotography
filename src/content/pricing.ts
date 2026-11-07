/**
 * Every price, photo count and policy line on the site comes from this file.
 * Change a number here, push to GitHub, and Vercel redeploys with the new rates —
 * the pricing page, homepage preview, booking estimate, Ask Flick and structured
 * data all update together.
 *
 * OWNER: set `status` to "confirmed" once you've approved these numbers.
 */

export type PackageId = "little" | "full" | "whole";

export interface PortraitPackage {
  id: PackageId;
  name: string;
  priceCents: number;
  photos: number;
  summary: string;
  features: string[];
  /** Shown as a quiet label. Don't say "most popular" until booking data supports it. */
  highlightLabel?: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  /** null = quoted personally, never guessed by the calculator. */
  priceCents: number | null;
  unit?: "each" | "flat";
}

export const pricing = {
  status: "draft" as "draft" | "confirmed",
  currency: "USD",

  packages: [
    {
      id: "little",
      name: "The Little Story",
      priceCents: 8900,
      photos: 8,
      summary: "A short, easy session for a few beautiful favorites.",
      features: [
        "8 finished, high-resolution edited photos",
        "One location",
        "Personal-use print release",
        "Private online gallery",
      ],
    },
    {
      id: "full",
      name: "The Full Story",
      priceCents: 14900,
      photos: 20,
      summary: "Room for variety: different poses, groupings and a few wandering candids.",
      features: [
        "20 finished, high-resolution edited photos",
        "Flexible, unhurried session pacing",
        "One location",
        "Basic planning help: light, outfits, location",
        "Personal-use print release",
        "Private online gallery",
      ],
      highlightLabel: "Our recommended starting point",
    },
    {
      id: "whole",
      name: "The Whole Story",
      priceCents: 24900,
      photos: 40,
      summary: "For big families, ambitious ideas, or when you want a lot of variety.",
      features: [
        "40 finished, high-resolution edited photos",
        "Flexible, unhurried session pacing",
        "Extra planned variety (subject to location and access)",
        "Planning help: light, outfits, location",
        "Personal-use print release",
        "Private online gallery",
      ],
    },
  ] satisfies PortraitPackage[],

  extraPhoto: {
    priceCents: 1200,
    note: "Love more than your package includes? Add individual edited photos from your gallery.",
  },

  addOns: [
    {
      id: "extra-photos",
      name: "Extra edited photos",
      description: "Add finished photos beyond your package, chosen from your gallery.",
      priceCents: 1200,
      unit: "each",
    },
    {
      id: "second-location",
      name: "A second location",
      description: "Two settings in one session, when the light and the drive allow it.",
      priceCents: null,
    },
  ] satisfies AddOn[],

  /** Which booking categories can use the photo-count packages. */
  packageEligibleCategories: ["people", "animals"] as const,

  custom: {
    "weddings-events": {
      label: "Custom quote",
      intro:
        "Weddings and events are quoted for the coverage you actually need, with a clearly contracted coverage window.",
      factors: [
        "Hours of coverage (contracted start and end time)",
        "Must-have moments and shot list",
        "Number of finished photos and delivery timing",
        "Second shooter, if needed",
        "Travel, venue rules and backup plans",
      ],
      /** OWNER: e.g. "Most elopements start around $X." Leave null to hide. */
      exampleEstimate: null as string | null,
    },
    "business-branding": {
      label: "Custom quote",
      intro:
        "Business photography is quoted on what you'll use the photos for, how many people and products are involved, and how complex the day is.",
      factors: [
        "How you'll use the images (web, social, print, advertising)",
        "Headcount for team photos or headshots",
        "Product count and shot list",
        "Licensing and usage term",
        "Locations, styling and travel",
      ],
      exampleEstimate: null as string | null,
    },
  },

  travel: {
    /** OWNER: miles from your confirmed base before travel fees apply. null = not published yet. */
    includedRadiusMiles: null as number | null,
    copy: "Sessions within our core area don't carry a travel fee. Farther than that, we'll quote travel up front so there are no surprises.",
  },

  deposit: {
    /** OWNER: enable only after your contract and payment policies are final. */
    enabled: false,
    amountCents: null as number | null,
    copy: "A small retainer reserves your date and is applied to your total.",
  },

  noStopwatch: {
    headline: "The photographs matter. The stopwatch doesn't.",
    body: "For standard portrait sessions we focus on delivering your chosen number of strong, finished photographs, not on ending at a 30- or 60-minute mark. We'll take the time it reasonably takes.",
    boundaries:
      "Real-world limits still apply: daylight, weather, little ones' and animals' energy, venue access and keeping everyone safe. We'll agree on the plan before your session so the scope is clear. Weddings, events, rented venues and commercial work always have a contracted coverage time.",
  },

  revisionPolicy:
    "If something in a finished photo needs a reasonable correction, just ask. Reshoots are handled case by case, and we'll agree on the details in your booking agreement.",

  legalNote:
    "Prices are for standard portrait sessions in our core area. Sales tax, if applicable, and any travel quote are confirmed before you book.",
} as const;

export function formatPrice(cents: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(cents / 100);
}

export const startingPriceCents = Math.min(...pricing.packages.map((p) => p.priceCents));
