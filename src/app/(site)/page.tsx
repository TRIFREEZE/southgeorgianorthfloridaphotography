import type { Metadata } from "next";
import { site } from "@/content/site";
import { Hero } from "@/components/home/Hero";
import {
  AreasServed,
  ChooseYourStory,
  ExperienceTimeline,
  FaqPreview,
  FeaturedStories,
  MeetPhotographer,
  PricingPreview,
  Reviews,
  TrustBar,
  UnhurriedPromise,
  UtilityLine,
} from "@/components/home/sections";
import { QuickInquiry } from "@/components/booking/QuickInquiry";
import { Gallery } from "@/components/media/Gallery";
import { BuildYourStory } from "@/components/story/BuildYourStory";
import { Arrow, ButtonLink, Container, SectionHeading } from "@/components/ui/primitives";
import { getCategoryCovers, getFeaturedPhotos, getFounderPhoto, getHeroPhoto, getPortfolioPhotos } from "@/lib/photos";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "South Georgia & North Florida Photographer | Red Clay & Light",
  absoluteTitle: true,
  description: site.description,
  path: "/",
});

export default async function HomePage() {
  const [hero, mosaic, covers, founder, portfolio] = await Promise.all([
    getHeroPhoto(),
    getFeaturedPhotos(7),
    getCategoryCovers(),
    getFounderPhoto(),
    getPortfolioPhotos(),
  ]);

  return (
    <>
      <UtilityLine />
      <Hero photo={hero} />
      <TrustBar />

      <section className="py-20 sm:py-28" aria-labelledby="work-title">
        <Container>
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading id="work-title" eyebrow="Selected work" title="Real moments. Beautifully kept." />
            <ButtonLink href="/portfolio" variant="ghost" className="shrink-0">
              See the full portfolio <Arrow />
            </ButtonLink>
          </div>
          <Gallery photos={mosaic} layout="mosaic" label="Selected photographs" />
        </Container>
      </section>

      <UnhurriedPromise />
      <ChooseYourStory covers={covers} />
      <PricingPreview />
      <ExperienceTimeline />
      <MeetPhotographer portrait={founder} />

      <section className="py-20 sm:py-24" aria-labelledby="bys-title">
        <Container>
          <BuildYourStory photos={portfolio.photos} headingId="bys-title" />
        </Container>
      </section>

      <FeaturedStories />
      <Reviews />
      <AreasServed />
      <FaqPreview />

      <section id="start" className="pb-8 pt-12 sm:pt-16" aria-labelledby="final-cta-title">
        <Container>
          <div className="grid gap-10 rounded-[1.6rem] border border-line bg-gallery p-6 sm:p-10 lg:grid-cols-12 lg:p-14">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-4">Start here</p>
              <h2 id="final-cta-title" className="text-display-md">
                Let&apos;s make something worth keeping.
              </h2>
              <p className="mt-5 text-ink-soft">
                Tell us a little about what you&apos;re picturing. You&apos;ll hear back from a real person, not an automated booking
                system. Prefer more guidance? Use the session finder.
              </p>
              <div className="mt-6">
                <ButtonLink href="/book" variant="secondary">
                  Find my session <Arrow />
                </ButtonLink>
              </div>
            </div>
            <div className="lg:col-span-7">
              <QuickInquiry idPrefix="home" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
