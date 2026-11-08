import Link from "next/link";
import { experienceSteps } from "@/content/experience";
import { publishedPosts } from "@/content/journal";
import { site } from "@/content/site";
import type { Category, Faq, Pricing, Testimonial } from "@/lib/cms/schema";
import { textOf } from "@/lib/cms/texts";
import type { Photo } from "@/lib/photo-types";
import { PhotoFill } from "@/components/media/Photo";
import { SamplePlate } from "@/components/media/SamplePlate";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, SectionHeading } from "@/components/ui/primitives";
import { PackageCard } from "./PackageCard";

type Texts = Record<string, string>;

export function UtilityLine({ text }: { text: string }) {
  return (
    <div className="border-b border-line/70 bg-gallery/60">
      <Container className="flex min-h-9 items-center justify-center py-2 text-center text-[0.78rem] tracking-wide text-muted">{text}</Container>
    </div>
  );
}

const trust = [
  { title: "Relaxed sessions", body: "Portraits aren't run on a stopwatch." },
  { title: "Clear photo counts", body: "Know exactly how many finished photos you get." },
  { title: "Transparent pricing", body: "Real prices on the site, quotes in writing." },
  { title: "People, pets & businesses", body: "Families, horses, dogs, weddings, brands." },
];

export function TrustBar() {
  return (
    <section aria-label="What to expect" className="border-y border-line bg-gallery">
      <Container>
        <ul className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
          {trust.map((t, i) => (
            <li key={t.title} className={`px-1 py-6 sm:px-4 lg:px-8 ${i % 2 === 1 ? "pl-4 sm:pl-6" : ""}`} data-reveal style={{ ["--reveal-delay" as string]: `${i * 60}ms` }}>
              <p className="font-display text-[1.2rem] leading-tight sm:text-[1.35rem]">{t.title}</p>
              <p className="mt-1.5 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function UnhurriedPromise({ pricing, texts }: { pricing: Pricing; texts: Texts }) {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="promise-title">
      <Container className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-4" data-reveal>
            The unhurried promise
          </p>
          <h2 id="promise-title" className="text-display-lg" data-reveal>
            {textOf(texts, "home.promise.title")} <em className="text-clay">{textOf(texts, "home.promise.accent")}</em>
          </h2>
        </div>
        <div className="space-y-5 text-lede text-ink-soft lg:col-span-5 lg:col-start-8 lg:pt-12" data-reveal>
          <p>{pricing.noStopwatch.body}</p>
          <p className="text-base text-muted">{pricing.noStopwatch.boundaries}</p>
          <ButtonLink href="/experience" variant="ghost">
            How a session works <Arrow />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

export interface StoryCardItem {
  category: Category;
  cover: Photo | null;
  href: string;
  tone: number;
}

export function ChooseYourStory({ items, texts }: { items: StoryCardItem[]; texts: Texts }) {
  if (!items.length) return null;
  return (
    <section className="py-20 sm:py-24" aria-labelledby="choose-title">
      <Container>
        <SectionHeading id="choose-title" eyebrow="Choose your story" title={textOf(texts, "home.choose.title")} lede={textOf(texts, "home.choose.lede")} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {items.map(({ category: c, cover, href, tone }, i) => (
            <li key={c.id} data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <Link href={href} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.3rem] bg-sand sm:aspect-[5/4] lg:aspect-[16/11]" data-flick-look>
                <span className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]">
                  {cover ? (
                    <PhotoFill photo={cover} sizes="(min-width: 640px) 50vw, 100vw" showSampleLabel={false} />
                  ) : (
                    <SamplePlate photo={{ id: `cat-${c.id}`, category: c.id, title: c.label, tone, width: 5, height: 4 }} showLabel={false} />
                  )}
                </span>
                <span className="absolute inset-0 z-[2] bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-4 p-6 text-gallery sm:p-8">
                  <span>
                    <span className="block font-display text-[1.9rem] leading-none sm:text-[2.3rem]">{c.label}</span>
                    {c.description && <span className="mt-2 block max-w-sm text-sm text-sand/90">{c.description}</span>}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gallery/40 transition-colors group-hover:bg-gallery group-hover:text-ink">
                    <Arrow className="h-5 w-5" />
                  </span>
                </span>
                {(!cover || cover.isSample) && (
                  <span className="absolute left-4 top-4 z-[3] rounded-full bg-ink/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gallery">Sample</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function PricingPreview({ pricing, texts }: { pricing: Pricing; texts: Texts }) {
  return (
    <section className="bg-gallery py-20 sm:py-28" aria-labelledby="pricing-preview-title">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading id="pricing-preview-title" eyebrow="Straightforward pricing" title={pricing.noStopwatch.headline} lede={textOf(texts, "home.pricing.lede")} />
          <ButtonLink href="/pricing" variant="ghost" className="shrink-0">
            Full pricing &amp; inclusions <Arrow />
          </ButtonLink>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-5">
          {pricing.packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
        <p className="mt-8 text-center text-muted">
          Not sure?{" "}
          <Link href="/book" className="font-semibold text-clay-deep underline">
            We&apos;ll help you choose.
          </Link>
        </p>
      </Container>
    </section>
  );
}

export function ExperienceTimeline({ title }: { title: string }) {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="timeline-title">
      <Container>
        <SectionHeading id="timeline-title" eyebrow="How it works" title={title} />
        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
          <span aria-hidden className="absolute left-[1.1rem] top-2 bottom-2 w-px bg-line md:left-0 md:right-0 md:top-[1.1rem] md:bottom-auto md:h-px md:w-auto" />
          {experienceSteps.map((s, i) => (
            <li key={s.n} className="relative pl-12 md:pl-0 md:pt-14" data-reveal style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}>
              <span className="absolute left-0 top-0 flex h-[2.2rem] w-[2.2rem] items-center justify-center rounded-full border border-clay bg-parchment font-display text-sm text-clay-deep">{s.n}</span>
              <h3 className="text-[1.5rem]">{s.title}</h3>
              <p className="mt-2 text-[0.97rem] text-muted">{s.short}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function MeetPhotographer({ portrait, texts }: { portrait: Photo; texts: Texts }) {
  return (
    <section className="bg-rose/40 py-20 sm:py-28" aria-labelledby="meet-title">
      <Container className="grid items-center gap-10 md:grid-cols-12">
        <div className="md:col-span-5" data-reveal="crop">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.3rem] bg-sand">
            <PhotoFill photo={portrait} sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
        </div>
        <div className="md:col-span-6 md:col-start-7" data-reveal>
          <p className="eyebrow mb-4">Meet the photographer</p>
          <h2 id="meet-title" className="text-display-md">
            {textOf(texts, "about.lead")}
          </h2>
          <p className="mt-6 text-lede text-ink-soft">{textOf(texts, "about.short")}</p>
          <div className="mt-8">
            <ButtonLink href="/about" variant="secondary">
              The longer story <Arrow />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FeaturedStories({ covers }: { covers: Record<string, Photo | null> }) {
  const posts = publishedPosts().slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="py-20 sm:py-28" aria-labelledby="stories-title">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading id="stories-title" eyebrow="From the journal" title="Useful, honest notes before your session." />
          <ButtonLink href="/journal" variant="ghost" className="shrink-0">
            All journal posts <Arrow />
          </ButtonLink>
        </div>
        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.slug} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
              <Link href={`/journal/${p.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
                  <span className="absolute inset-0 transition-transform duration-1000 group-hover:scale-[1.04]">
                    {covers[p.slug] ? (
                      <PhotoFill photo={covers[p.slug]!} sizes="(min-width: 768px) 33vw, 100vw" />
                    ) : (
                      <SamplePlate photo={{ id: `post-${p.slug}`, category: p.coverCategory, title: p.title, tone: i * 4 + 2, width: 4, height: 3 }} showLabel={false} />
                    )}
                  </span>
                </div>
                <p className="eyebrow mt-5">
                  {p.category} · {p.readingMinutes} min read
                </p>
                <h3 className="mt-2 text-[1.45rem] leading-snug group-hover:text-clay-deep">{p.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function Reviews({ testimonials }: { testimonials: Testimonial[] }) {
  const items = testimonials.filter((t) => t.published && t.consent);
  if (items.length === 0) return null; // Real, consented reviews only.
  return (
    <section className="bg-gallery py-20 sm:py-28" aria-labelledby="reviews-title">
      <Container>
        <SectionHeading id="reviews-title" eyebrow="Kind words" title="From people we've photographed" />
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-parchment p-7" data-reveal>
              <blockquote className="font-display text-[1.3rem] leading-snug">&ldquo;{r.quote}&rdquo;</blockquote>
              <p className="mt-5 text-sm font-semibold">{r.name}</p>
              {r.context && <p className="text-sm text-muted">{r.context}</p>}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function AreasServed({ pricing, title }: { pricing: Pricing; title: string }) {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="areas-title">
      <Container className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading id="areas-title" eyebrow="Where we work" title={title} />
        </div>
        <div className="lg:col-span-6 lg:col-start-7" data-reveal>
          <ul className="flex flex-wrap gap-2.5">
            {site.serviceArea.towns.map((t) => (
              <li key={t.slug} className="rounded-full border border-ink/15 bg-gallery px-4 py-2 text-[0.95rem]">
                {t.name}, {t.state}
              </li>
            ))}
            <li className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-[0.95rem] text-muted">and nearby</li>
          </ul>
          <p className="mt-6 text-ink-soft">{pricing.travel.copy}</p>
          <p className="mt-3 text-muted">{site.serviceArea.outsideAreaNote}</p>
        </div>
      </Container>
    </section>
  );
}

export function FaqPreview({ faqs, title }: { faqs: Faq[]; title: string }) {
  const items = faqs.filter((f) => f.home);
  if (!items.length) return null;
  return (
    <section className="py-20 sm:py-24" aria-labelledby="faq-title">
      <Container className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-title" eyebrow="Good questions" title={title} />
          <div className="mt-8" data-reveal>
            <ButtonLink href="/faq" variant="ghost">
              All FAQs <Arrow />
            </ButtonLink>
          </div>
        </div>
        <div className="lg:col-span-8">
          <FaqList items={items} />
        </div>
      </Container>
    </section>
  );
}
