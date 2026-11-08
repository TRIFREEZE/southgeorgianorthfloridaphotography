import { z } from "zod";

/**
 * Shapes of everything the CMS stores. Stored JSON is always parsed through these
 * schemas, so a malformed row can never break the public site: invalid parts fall
 * back to defaults.
 */

const str = (max: number) => z.string().max(max);
const cents = z.number().int().min(0).max(10_000_000);

/* ------------------------------------------------------------------ photos */
export const focalSchema = z.object({
  dx: z.number().min(0).max(100).default(50),
  dy: z.number().min(0).max(100).default(50),
  mx: z.number().min(0).max(100).default(50),
  my: z.number().min(0).max(100).default(50),
});
export const zoomSchema = z.object({ d: z.number().min(1).max(3).default(1), m: z.number().min(1).max(3).default(1) });

export const licenseEnum = z.enum(["owner_original", "client_release", "model_release", "licensed", "pending"]);

export const photoStateSchema = z.object({
  storagePath: str(400),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative().nullable().default(null),
  blur: str(4000).nullable().default(null),
  originalPath: str(400).nullable().default(null),
  originalBytes: z.number().int().nonnegative().nullable().default(null),
  filename: str(240).nullable().default(null),
  title: str(160).default(""),
  alt: str(400).default(""),
  description: str(1200).default(""),
  location: str(160).default(""),
  categoryId: str(80).nullable().default(null),
  /** Extra categories this photo also appears in (besides `categoryId`). */
  alsoIn: z.array(str(80)).max(12).default([]),
  sortOrder: z.number().int().default(1000),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  focal: focalSchema.default({ dx: 50, dy: 50, mx: 50, my: 50 }),
  zoom: zoomSchema.default({ d: 1, m: 1 }),
  license: licenseEnum.default("owner_original"),
  permissionNote: str(400).default(""),
});
export type PhotoState = z.infer<typeof photoStateSchema>;

/** Fields the editor may change (file fields change only via upload/replace). */
const pct = z.number().min(0).max(100);
const zoomN = z.number().min(1).max(3);
export const photoPatchSchema = z
  .object({
    title: str(160),
    alt: str(400),
    description: str(1200),
    location: str(160),
    categoryId: str(80).nullable(),
    alsoIn: z.array(str(80)).max(12),
    /** Bulk helpers (not stored): add to / take out of a category, keeping the others. */
    addTo: str(80),
    removeFrom: str(80),
    sortOrder: z.number().int(),
    featured: z.boolean(),
    published: z.boolean(),
    focal: z.object({ dx: pct, dy: pct, mx: pct, my: pct }).partial(),
    zoom: z.object({ d: zoomN, m: zoomN }).partial(),
    license: licenseEnum,
    permissionNote: str(400),
  })
  .partial(); // no defaults here: a patch must only touch the fields it names
export type PhotoPatch = z.infer<typeof photoPatchSchema>;

/* ------------------------------------------------------------------ layout (photo placements) */
export const layoutSchema = z.object({
  hero: z.string().nullable().default(null),
  founder: z.string().nullable().default(null),
  /** The second founder's portrait (About page + homepage). */
  founder2: z.string().nullable().default(null),
  mosaic: z.array(z.string()).max(7).default([]),
  categoryCovers: z.record(z.string(), z.string().nullable()).default({}),
  serviceCovers: z.record(z.string(), z.string().nullable()).default({}),
  journalCovers: z.record(z.string(), z.string().nullable()).default({}),
  /** Up to 3 extra photos on the About page (empty slots are simply not shown). */
  aboutPhotos: z.array(z.string().nullable()).max(3).default([]),
});
export type Layout = z.infer<typeof layoutSchema>;

/* ------------------------------------------------------------------ categories (each can be a full session type) */
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const stepSchema = z.object({ title: str(120), body: str(600) });

/**
 * A category's service page, booking option and pricing. Every field is optional:
 * anything left out falls back to the original copy (built-in categories) or a
 * sensible generic default (new ones). The editor always saves the full set.
 */
export const serviceConfigSchema = z.object({
  /** Has its own service page and appears in Services, the footer and the sitemap. */
  enabled: z.boolean().optional(),
  slug: z.string().regex(slugRe).min(2).max(60).optional(),
  name: str(80).optional(),
  navLabel: str(60).optional(),
  headline: str(200).optional(),
  intro: str(1200).optional(),
  idealFor: z.array(str(200)).max(12).optional(),
  steps: z.array(stepSchema).max(8).optional(),
  timing: str(1200).optional(),
  cta: str(60).optional(),
  seoTitle: str(120).optional(),
  seoDescription: str(320).optional(),
  pricingMode: z.enum(["package", "quote"]).optional(),
  /** Packages offered for this category (empty = all). */
  packageIds: z.array(str(40)).max(8).optional(),
  quote: z
    .object({ title: str(80), intro: str(600), factors: z.array(str(160)).max(10), exampleEstimate: str(160).nullable(), cta: str(60) })
    .partial()
    .optional(),
  booking: z
    .object({ show: z.boolean(), label: str(60), hint: str(120), groupLabel: str(80), groupHint: str(120), askAnimals: z.boolean() })
    .partial()
    .optional(),
});
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/),
  slug: z.string().regex(slugRe, "Use lowercase letters, numbers and dashes.").min(2).max(60),
  label: str(80).min(1),
  description: str(300).default(""),
  visible: z.boolean().default(true),
  service: serviceConfigSchema.optional(),
});
export const categoriesSchema = z.array(categorySchema).max(40);
export type Category = z.infer<typeof categorySchema>;

/* ------------------------------------------------------------------ pricing */
export const packageSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: str(80).min(1),
  /** null = quoted personally ("Custom"). */
  priceCents: cents.nullable(),
  /** null = no fixed count (shown as `photosLabel`). */
  photos: z.number().int().min(1).max(2000).nullable(),
  photosLabel: str(40).optional(),
  summary: str(300),
  features: z.array(str(160)).max(12),
  highlightLabel: str(60).optional(),
});
export const addOnSchema = z.object({
  id: str(40),
  name: str(80),
  description: str(240),
  priceCents: cents.nullable(),
  unit: z.enum(["each", "flat"]).optional(),
});
const customQuoteSchema = z.object({ label: str(60), intro: str(500), factors: z.array(str(160)).max(10), exampleEstimate: str(160).nullable() });

export const CUSTOM_PACKAGE: z.infer<typeof packageSchema> = {
  id: "custom",
  name: "Custom",
  priceCents: null,
  photos: null,
  photosLabel: "Any number of photos",
  summary: "Something bigger or different: more photos, more places, a longer story. Tell us the idea and we'll quote it in writing.",
  features: ["As many finished photos as the story needs", "Multiple locations or longer coverage", "A written quote before you commit", "Private online gallery"],
};

const pricingBase = z.object({
  status: z.enum(["draft", "confirmed"]),
  currency: z.literal("USD").default("USD"),
  packages: z
    .array(packageSchema)
    .min(1, "Keep at least one package.")
    .max(8)
    .refine((l) => new Set(l.map((p) => p.id)).size === l.length, "Two packages share an id."),
  /** Data version. v2 added the "Custom" package. */
  packagesV: z.number().int().default(1),
  extraPhoto: z.object({ priceCents: cents, note: str(300) }),
  addOns: z.array(addOnSchema).max(8),
  packageEligibleCategories: z.array(z.string()).default(["people", "animals"]),
  /** Legacy per-category quote wording (now edited with each category). */
  custom: z.record(z.string(), customQuoteSchema).default({}),
  travel: z.object({ includedRadiusMiles: z.number().int().min(0).max(1000).nullable(), copy: str(500) }),
  deposit: z.object({ enabled: z.boolean(), amountCents: cents.nullable(), copy: str(300) }),
  noStopwatch: z.object({ headline: str(160), body: str(600), boundaries: str(800) }),
  revisionPolicy: str(600),
  legalNote: str(400),
});
/** Older saved pricing gets the "Custom" package once; after that the owner's list is kept as-is. */
export const pricingSchema = pricingBase.transform((p) =>
  p.packagesV >= 2 ? p : { ...p, packagesV: 2, packages: p.packages.some((x) => x.id === "custom") || p.packages.length >= 8 ? p.packages : [...p.packages, structuredClone(CUSTOM_PACKAGE)] },
);
export type Pricing = z.infer<typeof pricingSchema>;
export type PortraitPackage = z.infer<typeof packageSchema>;

/* ------------------------------------------------------------------ faqs & testimonials */
export const faqSchema = z.object({
  id: z.string().min(1).max(60),
  q: str(240).min(1),
  a: str(2000).min(1),
  topic: z.enum(["session", "pricing", "animals", "events", "delivery", "rights"]),
  home: z.boolean().default(false),
  /** Show on the main /faq page. */
  faqPage: z.boolean().default(true),
  /** Also show on these service pages (service slugs). */
  services: z.array(z.string().max(60)).max(8).default([]),
});
export const faqsSchema = z.array(faqSchema).max(80);
export type Faq = z.infer<typeof faqSchema>;

export const testimonialSchema = z.object({
  id: z.string().min(1).max(60),
  quote: str(1200).min(1),
  name: str(80).min(1),
  context: str(120).default(""),
  date: str(20).default(""),
  consent: z.boolean().default(false),
  published: z.boolean().default(false),
});
export const testimonialsSchema = z.array(testimonialSchema).max(60);
export type Testimonial = z.infer<typeof testimonialSchema>;

/* ------------------------------------------------------------------ build your story */
const optId = z.string().regex(/^[a-z0-9-]{1,40}$/);
export const storySchema = z.object({
  subjects: z
    .array(
      z.object({
        id: optId,
        label: str(60).min(1),
        /** Category this choice belongs to: decides the booking path and the photos shown. */
        categoryId: str(80).nullable().default(null),
        /** Suggested package, or null for a custom quote. */
        pkg: str(40).nullable().default(null),
        noun: str(60).default(""),
        tip: str(400).default(""),
        /** Hand-picked photos for this choice (otherwise the category's photos). */
        photoIds: z.array(z.string().max(64)).max(12).default([]),
      }),
    )
    .min(1)
    .max(16),
  feelings: z
    .array(z.object({ id: optId, label: str(60).min(1), line: str(160).default(""), tip: str(400).default(""), photoIds: z.array(z.string().max(64)).max(12).default([]) }))
    .min(1)
    .max(12),
  seasons: z.array(z.object({ id: optId, label: str(60).min(1) })).max(12),
});
export type StoryConfig = z.infer<typeof storySchema>;

/* ------------------------------------------------------------------ texts */
export const textsSchema = z.record(z.string().max(120), str(20000));
export type Texts = Record<string, string>;

/* ------------------------------------------------------------------ all content */
export type ContentKey = "layout" | "categories" | "pricing" | "texts" | "faqs" | "testimonials" | "story";

export interface SiteContent {
  layout: Layout;
  categories: Category[];
  pricing: Pricing;
  texts: Texts;
  faqs: Faq[];
  testimonials: Testimonial[];
  /** null = the original story options (with any older text edits). */
  story: StoryConfig | null;
}

export const contentSchemas = {
  layout: layoutSchema,
  categories: categoriesSchema,
  pricing: pricingSchema,
  texts: textsSchema,
  faqs: faqsSchema,
  testimonials: testimonialsSchema,
  story: storySchema.nullable(),
} as const;
