import { bookingCategories, services } from "@/content/services";
import type { Category, ServiceConfig, SiteContent, StoryConfig } from "./schema";
import { editedServices, editedStory, textOf } from "./texts";

/**
 * Session types: every category is a portfolio filter, and (unless switched off)
 * also a service page, a booking option and a pricing entry. This module turns the
 * stored categories into those, so adding a category in /admin → Categories shows
 * up everywhere at once. Pure and shared by server and client code.
 */

export interface SessionStep {
  title: string;
  body: string;
}

export interface SessionType {
  categoryId: string;
  categorySlug: string;
  /** Id used by the booking form and stored on inquiries. */
  bookingId: string;
  /** Service page address: /services/<slug>. */
  slug: string;
  label: string;
  description: string;
  visible: boolean;
  /** Has a service page (and a footer/services listing). */
  hasPage: boolean;
  name: string;
  navLabel: string;
  headline: string;
  intro: string;
  idealFor: string[];
  steps: SessionStep[];
  timing: string;
  cta: string;
  seoTitle: string;
  seoDescription: string;
  pricingMode: "package" | "quote";
  packageIds: string[];
  quote: { title: string; intro: string; factors: string[]; exampleEstimate: string | null; cta: string };
  booking: { show: boolean; label: string; hint: string; groupLabel: string; groupHint: string; askAnimals: boolean };
  builtIn: boolean;
}

/** What the booking form needs about each option (small enough to send to the browser). */
export type BookingOption = Pick<SessionType, "bookingId" | "categoryId" | "pricingMode" | "packageIds"> & {
  label: string;
  hint: string;
  groupLabel: string;
  groupHint: string;
  askAnimals: boolean;
  quoteIntro: string;
  /** Service page, when there is one. */
  href: string | null;
};

export const OTHER_BOOKING: BookingOption = {
  bookingId: "other",
  categoryId: "",
  pricingMode: "quote",
  packageIds: [],
  label: "Something else",
  hint: "Tell us your idea",
  groupLabel: "Who or what is in the photos?",
  groupHint: "A sentence is plenty",
  askAnimals: false,
  quoteIntro: "Tell us your idea and we'll put together a clear quote.",
  href: null,
};

const BOOKING_EXTRAS: Record<string, { groupLabel: string; groupHint: string; askAnimals: boolean }> = {
  people: { groupLabel: "Who's in the photos?", groupHint: "e.g. 2 adults, 3 kids, grandma", askAnimals: false },
  animals: { groupLabel: "Who's in the photos?", groupHint: "e.g. you, your horse and a very good dog", askAnimals: true },
  "weddings-events": { groupLabel: "Guest count & hours you're thinking", groupHint: "e.g. ~80 guests, ceremony + reception", askAnimals: false },
  "business-branding": { groupLabel: "Headcount & what you need", groupHint: "e.g. 6 team headshots + product photos", askAnimals: false },
};

const QUOTE_META: Record<string, { titleKey: string; title: string; ctaKey: string; cta: string }> = {
  "weddings-events": { titleKey: "pricing.custom.weddingTitle", title: "Weddings & events", ctaKey: "pricing.custom.weddingCta", cta: "Ask about my date" },
  "business-branding": { titleKey: "pricing.custom.businessTitle", title: "Business & branding", ctaKey: "pricing.custom.businessCta", cta: "Start planning" },
};

const DEFAULT_FACTORS = ["What you'd like photographed", "How many finished photos you need", "Location, timing and travel", "How the photos will be used"];

const nonEmpty = (v: string | undefined | null) => (v != null && v.trim() !== "" ? v : undefined);
const nonEmptyList = <T,>(v: T[] | undefined) => (v && v.length ? v : undefined);

type Ctx = Pick<SiteContent, "texts" | "pricing">;

/** Resolve one category into a full session type. Saved settings win, then older text edits, then defaults. */
export function resolveSession(c: Category, ctx: Ctx, taken: { booking: Set<string>; slugs: Set<string> } = { booking: new Set(), slugs: new Set() }): SessionType {
  const cfg: ServiceConfig = c.service ?? {};
  const base = editedServices(ctx.texts).find((s) => s.category === c.id);
  const builtIn = Boolean(base);

  let bookingId = base?.bookingCategory ?? c.id;
  if (bookingId === "other" || taken.booking.has(bookingId)) bookingId = `cat-${c.id}`;
  taken.booking.add(bookingId);

  let slug = cfg.slug ?? base?.slug ?? c.slug;
  while (taken.slugs.has(slug)) slug = `${slug}-session`;
  taken.slugs.add(slug);

  const bc = bookingCategories.find((b) => b.id === bookingId);
  const legacyQuote = ctx.pricing.custom[bookingId];
  const meta = QUOTE_META[bookingId];
  const name = nonEmpty(cfg.name) ?? base?.name ?? c.label;
  const intro = nonEmpty(cfg.intro) ?? base?.intro ?? (c.description || `${c.label}, photographed in natural light, at an unhurried pace.`);
  const pricingMode = cfg.pricingMode ?? (base ? (ctx.pricing.packageEligibleCategories.includes(bookingId) ? "package" : "quote") : "package");
  const allIds = ctx.pricing.packages.map((p) => p.id);
  const picked = (cfg.packageIds ?? []).filter((id) => allIds.includes(id));
  const extras = BOOKING_EXTRAS[bookingId];

  return {
    categoryId: c.id,
    categorySlug: c.slug,
    bookingId,
    slug,
    label: c.label,
    description: c.description,
    visible: c.visible,
    hasPage: c.visible && cfg.enabled !== false,
    name,
    navLabel: nonEmpty(cfg.navLabel) ?? base?.navLabel ?? name,
    headline: nonEmpty(cfg.headline) ?? base?.headline ?? name,
    intro,
    idealFor: nonEmptyList(cfg.idealFor) ?? base?.idealFor ?? [],
    steps: nonEmptyList(cfg.steps) ?? base?.howItWorks ?? [
      { title: "Tell us what you have in mind", body: "A few sentences is plenty. We'll ask about anything else we need." },
      { title: "Plan the light and the place", body: "We'll pick a time and setting that suit what we're photographing." },
      { title: "Get your finished photos", body: "Edited, high-resolution photos in a private online gallery." },
    ],
    timing: nonEmpty(cfg.timing) ?? base?.timing ?? "We'll agree on the plan, timing and any practical limits (daylight, access, weather) before your date.",
    cta: nonEmpty(cfg.cta) ?? base?.cta ?? "Start planning",
    seoTitle: nonEmpty(cfg.seoTitle) ?? base?.seoTitle ?? `${name} Photographer in South Georgia & North Florida`,
    seoDescription: nonEmpty(cfg.seoDescription) ?? base?.seoDescription ?? intro.slice(0, 300),
    pricingMode,
    packageIds: picked.length ? picked : allIds,
    quote: {
      title: nonEmpty(cfg.quote?.title) ?? (meta ? textOf(ctx.texts, meta.titleKey) || meta.title : name),
      intro: nonEmpty(cfg.quote?.intro) ?? legacyQuote?.intro ?? `${name} sessions are quoted for exactly what you need, in writing, before you commit.`,
      factors: nonEmptyList(cfg.quote?.factors) ?? legacyQuote?.factors ?? DEFAULT_FACTORS,
      exampleEstimate: cfg.quote?.exampleEstimate !== undefined ? cfg.quote.exampleEstimate : (legacyQuote?.exampleEstimate ?? null),
      cta: nonEmpty(cfg.quote?.cta) ?? (meta ? textOf(ctx.texts, meta.ctaKey) || meta.cta : "Ask for a quote"),
    },
    booking: {
      show: c.visible && cfg.booking?.show !== false,
      label: nonEmpty(cfg.booking?.label) ?? bc?.label ?? c.label,
      hint: nonEmpty(cfg.booking?.hint) ?? bc?.hint ?? (c.description || "Tell us what you have in mind"),
      groupLabel: nonEmpty(cfg.booking?.groupLabel) ?? extras?.groupLabel ?? "What are we photographing?",
      groupHint: nonEmpty(cfg.booking?.groupHint) ?? extras?.groupHint ?? "A sentence is plenty",
      askAnimals: cfg.booking?.askAnimals ?? extras?.askAnimals ?? false,
    },
    builtIn,
  };
}

/** All session types in the owner's category order. Hidden ones only with `includeHidden`. */
export function sessionTypes(ctx: Ctx & Pick<SiteContent, "categories">, opts: { includeHidden?: boolean } = {}): SessionType[] {
  const taken = { booking: new Set<string>(), slugs: new Set<string>() };
  const all = ctx.categories.map((c) => resolveSession(c, ctx, taken));
  return opts.includeHidden ? all : all.filter((s) => s.visible);
}

export const servicePages = (ctx: Ctx & Pick<SiteContent, "categories">) => sessionTypes(ctx).filter((s) => s.hasPage);
export const sessionBySlug = (ctx: Ctx & Pick<SiteContent, "categories">, slug: string) => servicePages(ctx).find((s) => s.slug === slug) ?? null;
export const sessionForCategory = (ctx: Ctx & Pick<SiteContent, "categories">, categoryId: string | null | undefined) =>
  categoryId ? (sessionTypes(ctx).find((s) => s.categoryId === categoryId) ?? null) : null;

/** The booking form's choices, with "Something else" last (its words are editable in Page text). */
export function bookingOptions(ctx: Ctx & Pick<SiteContent, "categories">, opts: { includeHidden?: boolean } = {}): BookingOption[] {
  const list = sessionTypes(ctx, opts)
    .filter((s) => opts.includeHidden || s.booking.show)
    .map<BookingOption>((s) => ({
      bookingId: s.bookingId,
      categoryId: s.categoryId,
      pricingMode: s.pricingMode,
      packageIds: s.packageIds,
      label: s.booking.label,
      hint: s.booking.hint,
      groupLabel: s.booking.groupLabel,
      groupHint: s.booking.groupHint,
      askAnimals: s.booking.askAnimals,
      quoteIntro: s.quote.intro,
      href: s.hasPage ? `/services/${s.slug}` : null,
    }));
  return [...list, { ...OTHER_BOOKING, label: textOf(ctx.texts, "book.other.label") || OTHER_BOOKING.label, hint: textOf(ctx.texts, "book.other.hint") || OTHER_BOOKING.hint }];
}

/** Where a category card links: its service page when it has one, else its gallery. */
export function categoryHref(ctx: Ctx & Pick<SiteContent, "categories">, c: Pick<Category, "id" | "slug">) {
  const s = sessionForCategory(ctx, c.id);
  return s?.hasPage ? `/services/${s.slug}` : `/portfolio/${c.slug}`;
}

export const bookingIdFor = (ctx: Ctx & Pick<SiteContent, "categories">, categoryId: string | null | undefined) => {
  const s = sessionForCategory(ctx, categoryId);
  return s?.booking.show ? s.bookingId : "other";
};

/* ------------------------------------------------------------------ build your story */

export interface StorySubject {
  id: string;
  label: string;
  categoryId: string | null;
  /** Booking option this leads to. */
  booking: string;
  pkg: string | null;
  noun: string;
  tip: string;
  photoIds: string[];
}
export interface StoryFeeling {
  id: string;
  label: string;
  line: string;
  tip: string;
  photoIds: string[];
}
export interface StoryContent {
  subjects: StorySubject[];
  feelings: StoryFeeling[];
  seasons: { id: string; label: string }[];
}

/** The original options with any older text edits, in the stored shape. */
export function defaultStoryConfig(texts: Record<string, string>): StoryConfig {
  const legacy = editedStory(texts);
  return {
    subjects: legacy.subjects.map((s) => ({ id: s.id, label: s.label, categoryId: s.category, pkg: s.pkg, noun: s.noun, tip: s.tip, photoIds: [] })),
    feelings: legacy.feelings.map((f) => ({ id: f.id, label: f.label, line: f.line, tip: f.tip, photoIds: [] })),
    seasons: legacy.seasons.map((x) => ({ id: x.id, label: x.label })),
  };
}

/** Story options ready for the builder: each subject knows its booking path; missing packages fall back to a quote. */
export function resolvedStory(content: Pick<SiteContent, "texts" | "pricing" | "categories" | "story">): StoryContent {
  const cfg = content.story ?? defaultStoryConfig(content.texts);
  const sessions = sessionTypes(content);
  const pkgIds = new Set(content.pricing.packages.map((p) => p.id));
  return {
    subjects: cfg.subjects.map((s) => {
      const session = sessions.find((x) => x.categoryId === s.categoryId);
      const pkg = session?.pricingMode === "package" && s.pkg && pkgIds.has(s.pkg) && session.packageIds.includes(s.pkg) ? s.pkg : null;
      return { ...s, categoryId: session ? s.categoryId : null, booking: session?.booking.show ? session.bookingId : "other", pkg };
    }),
    feelings: cfg.feelings,
    seasons: cfg.seasons,
  };
}

/** Photos to show for a story choice: hand-picked ones first (feeling, then subject), else the subject's category. */
export function storyPhotos<P extends { id: string; category: string | null; categories?: string[] }>(photos: P[], subject: Pick<StorySubject, "categoryId" | "photoIds"> | null | undefined, feeling?: Pick<StoryFeeling, "photoIds"> | null, limit = 8): P[] {
  const byId = (ids: string[]) => ids.map((id) => photos.find((p) => p.id === id)).filter((p): p is P => Boolean(p));
  const inCat = (p: P) => !subject?.categoryId || (p.categories ?? (p.category ? [p.category] : [])).includes(subject.categoryId);
  const picked = [...byId(feeling?.photoIds ?? []), ...(subject?.photoIds.length ? byId(subject.photoIds) : photos.filter(inCat))];
  return [...new Map(picked.map((p) => [p.id, p])).values()].slice(0, limit);
}
