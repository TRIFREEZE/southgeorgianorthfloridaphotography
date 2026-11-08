import { describe, expect, it } from "vitest";
import { defaultContent } from "@/lib/cms/defaults";
import { pricingSchema, type Category } from "@/lib/cms/schema";
import { bookingOptions, categoryHref, resolvedStory, servicePages, sessionTypes, storyPhotos } from "@/lib/cms/sessions";

const base = defaultContent();
const cars: Category = { id: "cars", slug: "cars-trucks-bikes", label: "Cars, trucks & bikes", description: "Classic cars, trucks and motorcycles.", visible: true };

describe("session types", () => {
  it("keeps the original four services exactly as before", () => {
    const s = sessionTypes(base);
    expect(s.map((x) => [x.categoryId, x.bookingId, x.slug, x.pricingMode])).toEqual([
      ["people", "people", "portraits-families", "package"],
      ["animals", "animals", "pets-horses", "package"],
      ["weddings-events", "weddings-events", "weddings-events", "quote"],
      ["brands", "business-branding", "business-branding", "quote"],
    ]);
    expect(s[2].quote.intro).toBe(base.pricing.custom["weddings-events"].intro);
  });

  it("keeps older Page-text edits to a service", () => {
    const s = sessionTypes({ ...base, texts: { "services.pets-horses.name": "Pets, Horses & Farm" } });
    expect(s[1].name).toBe("Pets, Horses & Farm");
  });

  it("a new category shows up everywhere: service page, booking, links", () => {
    const content = { ...base, categories: [...base.categories, cars] };
    const pages = servicePages(content);
    expect(pages.at(-1)).toMatchObject({ slug: "cars-trucks-bikes", name: "Cars, trucks & bikes", pricingMode: "package", hasPage: true });
    const opts = bookingOptions(content);
    expect(opts.map((o) => o.bookingId)).toEqual(["people", "animals", "weddings-events", "business-branding", "cars", "other"]);
    expect(categoryHref(content, cars)).toBe("/services/cars-trucks-bikes");
  });

  it("respects the owner's choices: quote, no page, not bookable, hidden", () => {
    const quoted = { ...cars, service: { pricingMode: "quote" as const, enabled: false, quote: { intro: "Quoted per vehicle." } } };
    let content = { ...base, categories: [...base.categories, quoted] };
    expect(servicePages(content).some((s) => s.categoryId === "cars")).toBe(false);
    expect(categoryHref(content, cars)).toBe("/portfolio/cars-trucks-bikes");
    const o = bookingOptions(content).find((x) => x.bookingId === "cars")!;
    expect(o).toMatchObject({ pricingMode: "quote", quoteIntro: "Quoted per vehicle.", href: null });
    content = { ...base, categories: [...base.categories, { ...quoted, service: { booking: { show: false } } }] };
    expect(bookingOptions(content).some((x) => x.bookingId === "cars")).toBe(false);
    content = { ...base, categories: [...base.categories, { ...cars, visible: false }] };
    expect(bookingOptions(content).some((x) => x.bookingId === "cars")).toBe(false);
  });

  it("never collides with the reserved 'other' booking id or another page address", () => {
    const content = { ...base, categories: [...base.categories, { ...cars, id: "other", slug: "other" }, { ...cars, id: "pets-2", slug: "pets-2", service: { slug: "pets-horses" } }] };
    const s = sessionTypes(content);
    expect(s.find((x) => x.categoryId === "other")!.bookingId).toBe("cat-other");
    expect(new Set(s.map((x) => x.slug)).size).toBe(s.length);
  });
});

describe("pricing upgrade", () => {
  it("adds the Custom package to older saved pricing once", () => {
    const old = { ...JSON.parse(JSON.stringify(base.pricing)), packagesV: undefined, packages: base.pricing.packages.filter((p) => p.id !== "custom") };
    const up = pricingSchema.parse(old);
    expect(up.packages.map((p) => p.id)).toEqual(["little", "full", "whole", "custom"]);
    expect(up.packages[3].priceCents).toBeNull();
    // Once upgraded, removing it sticks.
    const removed = pricingSchema.parse({ ...up, packages: up.packages.slice(0, 3) });
    expect(removed.packages).toHaveLength(3);
  });
});

describe("story", () => {
  it("leads each choice to its category's booking path and drops packages a quoted category can't use", () => {
    const st = resolvedStory(base);
    expect(st.subjects.find((s) => s.id === "business")).toMatchObject({ booking: "business-branding", pkg: null });
    const content = { ...base, story: { subjects: [{ id: "car", label: "My car", categoryId: "cars", pkg: "full", noun: "car portraits", tip: "", photoIds: [] }], feelings: st.feelings, seasons: st.seasons }, categories: [...base.categories, { ...cars, service: { pricingMode: "quote" as const } }] };
    expect(resolvedStory(content).subjects[0]).toMatchObject({ booking: "cars", pkg: null });
  });

  it("shows hand-picked photos first, else the category's", () => {
    const photos = [
      { id: "a", category: "people" },
      { id: "b", category: "animals", categories: ["animals", "people"] },
      { id: "c", category: "animals" },
    ];
    expect(storyPhotos(photos, { categoryId: "people", photoIds: [] }).map((p) => p.id)).toEqual(["a", "b"]);
    expect(storyPhotos(photos, { categoryId: "people", photoIds: ["c"] }, { photoIds: ["a"] }).map((p) => p.id)).toEqual(["a", "c"]);
  });
});
