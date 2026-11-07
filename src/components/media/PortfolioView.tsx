import Link from "next/link";
import { portfolioCategories, type CategoryId } from "@/content/services";
import type { Photo } from "@/lib/photo-types";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";
import { Gallery } from "./Gallery";

export function PortfolioFilters({ active }: { active?: CategoryId }) {
  const items = [{ id: undefined, label: "All work", href: "/portfolio" }, ...portfolioCategories.map((c) => ({ id: c.id, label: c.label, href: `/portfolio/${c.id}` }))];
  return (
    <nav aria-label="Portfolio categories" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                scroll={false}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-[0.95rem] transition-colors ${
                  on ? "border-ink bg-ink text-gallery" : "border-ink/20 hover:border-ink/60"
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PortfolioView({ photos, isReal, active }: { photos: Photo[]; isReal: boolean; active?: CategoryId }) {
  const cat = portfolioCategories.find((c) => c.id === active);
  return (
    <Container className="pb-10">
      <PortfolioFilters active={active} />
      {!isReal && (
        <p className="mt-6 rounded-xl border border-dashed border-clay/50 bg-gallery px-4 py-3 text-sm text-muted">
          These are labeled sample placeholders. Original portfolio photographs will appear here once they&apos;re published.
        </p>
      )}
      <div className="mt-8">
        {photos.length ? (
          <Gallery photos={photos} layout="masonry" deepLink label={cat ? `${cat.label} photographs` : "All photographs"} />
        ) : (
          <p className="py-16 text-center text-muted">New work for this category is on its way.</p>
        )}
      </div>
      {cat && (
        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[1.4rem] bg-gallery p-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-[1.6rem]">Want photos like these?</p>
            <p className="text-muted">See what&apos;s included and how {cat.label.toLowerCase()} sessions work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/services/${cat.serviceSlug}`} variant="secondary">
              About these sessions
            </ButtonLink>
            <ButtonLink href={`/book?category=${cat.bookingCategory}`}>
              Start planning <Arrow />
            </ButtonLink>
          </div>
        </div>
      )}
    </Container>
  );
}
