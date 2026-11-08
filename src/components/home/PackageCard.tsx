import Link from "next/link";
import { packagePhotos, packagePrice } from "@/content/pricing";
import type { PortraitPackage } from "@/lib/cms/schema";

/** Grid classes for a row of package cards, so 3, 4 or more packages all sit evenly. */
export const packageGrid = (n: number) => (n <= 1 ? "" : n === 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3" : n === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3");

export function PackageCard({ pkg, compact = false, category }: { pkg: PortraitPackage; compact?: boolean; category?: string }) {
  const highlighted = Boolean(pkg.highlightLabel);
  const quoted = pkg.priceCents == null;
  const photos = pkg.photos == null ? packagePhotos(pkg) : `${pkg.photos} edited photos`;
  const href = `/book?${new URLSearchParams({ ...(category ? { category } : {}), package: pkg.id }).toString()}`;
  return (
    <article
      className={`relative flex h-full flex-col rounded-[var(--radius-card)] border p-6 sm:p-7 ${
        highlighted ? "border-ink bg-ink text-gallery on-dark" : "border-line bg-gallery"
      }`}
      aria-labelledby={`pkg-${pkg.id}`}
      data-reveal
    >
      {pkg.highlightLabel && (
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-clay-light/20 px-3 py-1 text-xs font-semibold tracking-wide text-clay-light">
          {pkg.highlightLabel}
        </p>
      )}
      <h3 id={`pkg-${pkg.id}`} className="text-[1.75rem]">
        {pkg.name}
      </h3>
      <p className={`mt-2 text-sm ${highlighted ? "text-sand/85" : "text-muted"}`}>{pkg.summary}</p>
      {quoted ? (
        <p className="mt-6">
          <span className="block font-display text-[2.9rem] leading-none">Quoted</span>
          <span className={`mt-2 block text-sm ${highlighted ? "text-sand/80" : "text-muted"}`}>{photos} · priced for what you need</span>
        </p>
      ) : (
        <p className="mt-6 flex items-baseline gap-2">
          <span className="font-display text-[2.9rem] leading-none">{packagePrice(pkg)}</span>
          <span className={`text-sm ${highlighted ? "text-sand/80" : "text-muted"}`}>· {photos}</span>
        </p>
      )}
      {!compact && (
        <ul className={`mt-6 space-y-2.5 text-[0.95rem] ${highlighted ? "text-sand" : "text-ink-soft"}`}>
          {pkg.features.map((f) => (
            <li key={f} className="flex gap-3">
              <span aria-hidden className={`dash mt-[0.65em] ${highlighted ? "border-clay-light" : ""}`} />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-7">
        <Link
          href={href}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-full text-[0.95rem] font-semibold transition-colors ${
            highlighted ? "bg-gallery text-ink hover:bg-sand" : "border border-ink/25 hover:border-ink hover:bg-parchment"
          }`}
        >
          {quoted ? `Ask about ${pkg.name.replace("The ", "")}` : `Choose ${pkg.name.replace("The ", "")}`}
          <span className="sr-only">: {packagePrice(pkg)}, {photos}</span>
        </Link>
      </div>
    </article>
  );
}
