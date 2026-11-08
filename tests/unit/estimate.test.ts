import { describe, expect, it } from "vitest";
import { defaultContent } from "@/lib/cms/defaults";
import { bookingOptions } from "@/lib/cms/sessions";
import { estimate, isPackageEligible, packagesFor } from "@/lib/inquiry/estimate";

const content = defaultContent();
const pricing = content.pricing;
const options = bookingOptions(content);
const price = (id: string) => pricing.packages.find((p) => p.id === id)!.priceCents!;

describe("estimate", () => {
  it("prices a package straight from config", () => {
    const e = estimate({ category: "people", packageId: "full" }, pricing, options);
    expect(e.kind).toBe("package");
    if (e.kind === "package") expect(e.totalCents).toBe(price("full"));
  });

  it("adds extra photos at the configured rate and clamps abuse", () => {
    const e = estimate({ category: "animals", packageId: "little", extraPhotos: 3 }, pricing, options);
    if (e.kind !== "package") throw new Error("expected package");
    expect(e.totalCents).toBe(price("little") + 3 * pricing.extraPhoto.priceCents);
    const big = estimate({ category: "animals", packageId: "little", extraPhotos: 10_000 }, pricing, options);
    if (big.kind !== "package") throw new Error("expected package");
    expect(big.totalCents).toBe(price("little") + 60 * pricing.extraPhoto.priceCents);
  });

  it("never invents a price for quoted add-ons or travel", () => {
    const e = estimate({ category: "people", packageId: "whole", addOns: ["second-location"] }, pricing, options);
    if (e.kind !== "package") throw new Error("expected package");
    expect(e.totalCents).toBe(price("whole"));
    expect(e.quotedItems.join(" ")).toMatch(/second location/i);
    expect(e.quotedItems.join(" ")).toMatch(/travel/i);
  });

  it("returns a custom quote for weddings and business work, never a $149 wedding", () => {
    for (const category of ["weddings-events", "business-branding", "other"]) {
      expect(isPackageEligible(category, options)).toBe(false);
      expect(estimate({ category, packageId: "full" }, pricing, options).kind).toBe("quote");
    }
  });

  it("treats the Custom package as a quote, not a $0 estimate", () => {
    const e = estimate({ category: "people", packageId: "custom", extraPhotos: 5 }, pricing, options);
    expect(e.kind).toBe("quote");
  });

  it("only offers a category's chosen packages", () => {
    const opts = options.map((o) => (o.bookingId === "animals" ? { ...o, packageIds: ["little", "custom"] } : o));
    expect(packagesFor("animals", pricing, opts).map((p) => p.id)).toEqual(["little", "custom"]);
    expect(estimate({ category: "animals", packageId: "whole" }, pricing, opts).kind).toBe("incomplete");
  });

  it("asks for a choice when no package is selected", () => {
    expect(estimate({ category: "people" }, pricing, options).kind).toBe("incomplete");
  });
});
