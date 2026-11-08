import { formatPrice, type PackageId } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import type { BookingCategory } from "@/content/services";

export interface EstimateInput {
  category: BookingCategory;
  packageId?: PackageId | null;
  extraPhotos?: number | null;
  addOns?: string[] | null;
}

export type Estimate =
  | {
      kind: "package";
      totalCents: number;
      lines: { label: string; cents: number }[];
      quotedItems: string[];
      label: string;
    }
  | { kind: "quote"; label: string; reason: string; quotedItems: string[] }
  | { kind: "incomplete"; label: string };

export const isPackageEligible = (c: BookingCategory, pricing?: Pick<Pricing, "packageEligibleCategories">) =>
  (pricing?.packageEligibleCategories ?? ["people", "animals"]).includes(c);

/**
 * Truthful estimate from the published pricing (edited in /admin → Content → Pricing). Shared by the booking wizard
 * (live display) and the server (stored with the inquiry), so the two can
 * never disagree. Anything without a configured price is listed as "quoted".
 */
export function estimate(input: EstimateInput, pricing: Pricing): Estimate {
  const travel = "Travel outside our core area (quoted up front)";

  if (!isPackageEligible(input.category, pricing)) {
    const reason =
      input.category === "weddings-events"
        ? pricing.custom["weddings-events"].intro
        : input.category === "business-branding"
          ? pricing.custom["business-branding"].intro
          : "Tell us your idea and we'll put together a clear quote.";
    return { kind: "quote", label: "Custom quote", reason, quotedItems: [travel] };
  }

  const pkg = pricing.packages.find((p) => p.id === input.packageId);
  if (!pkg) return { kind: "incomplete", label: "Choose a photo count to see your estimate" };

  const lines = [{ label: `${pkg.name} · ${pkg.photos} edited photos`, cents: pkg.priceCents }];
  const quotedItems: string[] = [];

  const extra = Math.max(0, Math.min(60, Math.floor(input.extraPhotos ?? 0)));
  if (extra > 0) lines.push({ label: `${extra} extra edited photo${extra === 1 ? "" : "s"}`, cents: extra * pricing.extraPhoto.priceCents });

  for (const id of input.addOns ?? []) {
    const add = pricing.addOns.find((a) => a.id === id);
    if (!add || add.id === "extra-photos") continue;
    if (add.priceCents == null) quotedItems.push(`${add.name} (quoted personally)`);
    else lines.push({ label: add.name, cents: add.priceCents });
  }
  quotedItems.push(travel);

  const totalCents = lines.reduce((s, l) => s + l.cents, 0);
  return { kind: "package", totalCents, lines, quotedItems, label: `Estimated ${formatPrice(totalCents)}` };
}
