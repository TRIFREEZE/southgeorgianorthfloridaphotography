import { formatPrice } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import type { BookingOption } from "@/lib/cms/sessions";

export interface EstimateInput {
  category: string;
  packageId?: string | null;
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

type Opt = Pick<BookingOption, "bookingId" | "pricingMode" | "packageIds" | "quoteIntro">;

/** Does this booking option use the photo-count packages? */
export const isPackageEligible = (category: string, options: readonly Opt[]) => options.find((o) => o.bookingId === category)?.pricingMode === "package";

/** The packages a booking option offers, in the owner's order. */
export const packagesFor = (category: string, pricing: Pick<Pricing, "packages">, options: readonly Opt[]) => {
  const o = options.find((x) => x.bookingId === category);
  if (!o || o.pricingMode !== "package") return [];
  const list = pricing.packages.filter((p) => !o.packageIds.length || o.packageIds.includes(p.id));
  return list.length ? list : pricing.packages;
};

/**
 * Truthful estimate from the published pricing and categories (edited in /admin).
 * Shared by the booking wizard (live display) and the server (stored with the
 * inquiry), so the two can never disagree. Anything without a configured price is
 * listed as "quoted".
 */
export function estimate(input: EstimateInput, pricing: Pricing, options: readonly Opt[]): Estimate {
  const travel = "Travel outside our core area (quoted up front)";
  const opt = options.find((o) => o.bookingId === input.category);

  if (!opt || opt.pricingMode !== "package") {
    const reason = opt?.quoteIntro || "Tell us your idea and we'll put together a clear quote.";
    return { kind: "quote", label: "Custom quote", reason, quotedItems: [travel] };
  }

  const pkg = packagesFor(input.category, pricing, options).find((p) => p.id === input.packageId);
  if (!pkg) return { kind: "incomplete", label: "Choose a photo count to see your estimate" };
  if (pkg.priceCents == null) {
    return { kind: "quote", label: `${pkg.name}: custom quote`, reason: pkg.summary || "Tell us what you have in mind and we'll quote it in writing.", quotedItems: [travel] };
  }

  const lines = [{ label: pkg.photos == null ? pkg.name : `${pkg.name} · ${pkg.photos} edited photos`, cents: pkg.priceCents }];
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
