import type { Metadata } from "next";
import { publishedPosts } from "@/content/journal";
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
import { getSiteData } from "@/lib/cms/data";
import { categoryHref } from "@/lib/cms/links";
import { categoryCover, founderPhoto, heroPhoto, journalCover, mosaicPhotos, portfolio, visibleCategories } from "@/lib/cms/resolve";
import { textOf } from "@/lib/cms/texts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "South Georgia & North Florida Photographer | Red Clay & Light",
  absoluteTitle: true,
  description: site.description,
  path: "/",
});

export default async function HomePage() {
  const d = await getSiteData();
  const { texts, pricing, faqs, testimonials } = d.content;
  const t = (k: string) => textOf(texts, k);
  const storyItems = visibleCategories(d).map((c, i) => ({ category: c, cover: categoryCover(d, c.id), href: categoryHref(c), tone: i * 3 }));
  const covers = Object.fromEntries(publishedPosts().map((p) => [p.slug, journalCover(d, p.slug)]));

  return (
    <>
      <UtilityLine text={t("home.utility")} />
      <Hero photo={heroPhoto(d)} texts={texts} pricing={pricing} />
      <TrustBar />

      <section className="py-20 sm:py-28" aria-labelledby="work-title">
        <Container>
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading id="work-title" eyebrow="Selected work" title={t("home.work.title")} />
            <ButtonLink href="/portfolio" variant="ghost" className="shrink-0">
              See the full portfolio <Arrow />
            </ButtonLink>
          </div>
          <Gallery photos={mosaicPhotos(d)} layout="mosaic" label="Selected photographs" />
        </Container>
      </section>

      <UnhurriedPromise pricing={pricing} texts={texts} />
      <ChooseYourStory items={storyItems} texts={texts} />
      <PricingPreview pricing={pricing} texts={texts} />
      <ExperienceTimeline title={t("home.timeline.title")} />
      <MeetPhotographer portrait={founderPhoto(d)} texts={texts} />

      <section className="py-20 sm:py-24" aria-labelledby="bys-title">
        <Container>
          <BuildYourStory photos={portfolio(d).photos} pricing={pricing} title={t("home.bys.title")} headingId="bys-title" />
        </Container>
      </section>

      <FeaturedStories covers={covers} />
      <Reviews testimonials={testimonials} />
      <AreasServed pricing={pricing} title={t("home.areas.title")} />
      <FaqPreview faqs={faqs} title={t("home.faq.title")} />

      <section id="start" className="pb-8 pt-12 sm:pt-16" aria-labelledby="final-cta-title">
        <Container>
          <div className="grid gap-10 rounded-[1.6rem] border border-line bg-gallery p-6 sm:p-10 lg:grid-cols-12 lg:p-14">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-4">Start here</p>
              <h2 id="final-cta-title" className="text-display-md">
                {t("home.final.title")}
              </h2>
              <p className="mt-5 text-ink-soft">{t("home.final.body")}</p>
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
