import { describe, expect, it } from "vitest";
import { pricing } from "@/content/pricing";
import { estimate, isPackageEligible } from "@/lib/inquiry/estimate";

describe("estimate", () => {
  it("prices a package straight from config", () => {
    const e = estimate({ category: "people", packageId: "full" });
    expect(e.kind).toBe("package");
    if (e.kind === "package") expect(e.totalCents).toBe(pricing.packages.find((p) => p.id === "full")!.priceCents);
  });

  it("adds extra photos at the configured rate and clamps abuse", () => {
    const e = estimate({ category: "animals", packageId: "little", extraPhotos: 3 });
    if (e.kind !== "package") throw new Error("expected package");
    expect(e.totalCents).toBe(pricing.packages[0].priceCents + 3 * pricing.extraPhoto.priceCents);
    const big = estimate({ category: "animals", packageId: "little", extraPhotos: 10_000 });
    if (big.kind !== "package") throw new Error("expected package");
    expect(big.totalCents).toBe(pricing.packages[0].priceCents + 60 * pricing.extraPhoto.priceCents);
  });

  it("never invents a price for quoted add-ons or travel", () => {
    const e = estimate({ category: "people", packageId: "whole", addOns: ["second-location"] });
    if (e.kind !== "package") throw new Error("expected package");
    expect(e.totalCents).toBe(pricing.packages[2].priceCents);
    expect(e.quotedItems.join(" ")).toMatch(/second location/i);
    expect(e.quotedItems.join(" ")).toMatch(/travel/i);
  });

  it("returns a custom quote for weddings and business work, never a $149 wedding", () => {
    for (const category of ["weddings-events", "business-branding", "other"] as const) {
      expect(isPackageEligible(category)).toBe(false);
      const e = estimate({ category, packageId: "full" });
      expect(e.kind).toBe("quote");
    }
  });

  it("asks for a choice when no package is selected", () => {
    expect(estimate({ category: "people" }).kind).toBe("incomplete");
  });
});
