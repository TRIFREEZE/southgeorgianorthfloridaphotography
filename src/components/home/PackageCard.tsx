import Link from "next/link";
import { formatPrice } from "@/content/pricing";
import type { PortraitPackage } from "@/lib/cms/schema";

export function PackageCard({ pkg, compact = false }: { pkg: PortraitPackage; compact?: boolean }) {
  const highlighted = Boolean(pkg.highlightLabel);
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
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-[2.9rem] leading-none">{formatPrice(pkg.priceCents)}</span>
        <span className={`text-sm ${highlighted ? "text-sand/80" : "text-muted"}`}>· {pkg.photos} edited photos</span>
      </p>
      {!compact && (
        <ul className={`mt-6 space-y-2.5 text-[0.95rem] ${highlighted ? "text-sand" : "text-ink-soft"}`}>
          {pkg.features.map((f) => (
            <li key={f} className="flex gap-3">
              <span aria-hidden className={`mt-[0.6em] h-px w-3 shrink-0 ${highlighted ? "bg-clay-light" : "bg-clay"}`} />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-7">
        <Link
          href={`/book?category=people&package=${pkg.id}`}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-full text-[0.95rem] font-semibold transition-colors ${
            highlighted ? "bg-gallery text-ink hover:bg-sand" : "border border-ink/25 hover:border-ink hover:bg-parchment"
          }`}
        >
          Choose {pkg.name.replace("The ", "")}
          <span className="sr-only">: {formatPrice(pkg.priceCents)}, {pkg.photos} photos</span>
        </Link>
      </div>
    </article>
  );
}
