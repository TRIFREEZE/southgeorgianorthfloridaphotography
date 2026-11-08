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
  mosaic: z.array(z.string()).max(7).default([]),
  categoryCovers: z.record(z.string(), z.string().nullable()).default({}),
  serviceCovers: z.record(z.string(), z.string().nullable()).default({}),
  journalCovers: z.record(z.string(), z.string().nullable()).default({}),
});
export type Layout = z.infer<typeof layoutSchema>;

/* ------------------------------------------------------------------ categories */
export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.").min(2).max(60),
  label: str(80).min(1),
  description: str(300).default(""),
  visible: z.boolean().default(true),
});
export const categoriesSchema = z.array(categorySchema).max(40);
export type Category = z.infer<typeof categorySchema>;

/* ------------------------------------------------------------------ pricing */
export const packageSchema = z.object({
  id: z.enum(["little", "full", "whole"]),
  name: str(80).min(1),
  priceCents: cents,
  photos: z.number().int().min(1).max(500),
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

export const pricingSchema = z.object({
  status: z.enum(["draft", "confirmed"]),
  currency: z.literal("USD").default("USD"),
  packages: z.array(packageSchema).length(3),
  extraPhoto: z.object({ priceCents: cents, note: str(300) }),
  addOns: z.array(addOnSchema).max(8),
  packageEligibleCategories: z.array(z.string()).default(["people", "animals"]),
  custom: z.object({ "weddings-events": customQuoteSchema, "business-branding": customQuoteSchema }),
  travel: z.object({ includedRadiusMiles: z.number().int().min(0).max(1000).nullable(), copy: str(500) }),
  deposit: z.object({ enabled: z.boolean(), amountCents: cents.nullable(), copy: str(300) }),
  noStopwatch: z.object({ headline: str(160), body: str(600), boundaries: str(800) }),
  revisionPolicy: str(600),
  legalNote: str(400),
});
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

/* ------------------------------------------------------------------ texts */
export const textsSchema = z.record(z.string(), str(4000));
export type Texts = Record<string, string>;

/* ------------------------------------------------------------------ all content */
export type ContentKey = "layout" | "categories" | "pricing" | "texts" | "faqs" | "testimonials";

export interface SiteContent {
  layout: Layout;
  categories: Category[];
  pricing: Pricing;
  texts: Texts;
  faqs: Faq[];
  testimonials: Testimonial[];
}

export const contentSchemas = {
  layout: layoutSchema,
  categories: categoriesSchema,
  pricing: pricingSchema,
  texts: textsSchema,
  faqs: faqsSchema,
  testimonials: testimonialsSchema,
} as const;
