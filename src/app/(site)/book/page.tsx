import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { QuickInquiry } from "@/components/booking/QuickInquiry";
import { ContactLink } from "@/components/layout/ContactLink";
import { BuildYourStory } from "@/components/story/BuildYourStory";
import { Container, PageHero } from "@/components/ui/primitives";
import { publicEnv } from "@/lib/env";
import { getSiteData } from "@/lib/cms/data";
import { portfolio } from "@/lib/cms/resolve";
import { textOf } from "@/lib/cms/texts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Book a Session: Find Your Photography Session",
  description:
    "Plan a portrait, family, pet, horse, wedding or business photography session in South Georgia or North Florida. Get a live estimate and a personal reply.",
  path: "/book",
});

export default async function BookPage() {
  const d = await getSiteData();
  const { photos } = portfolio(d);
  const { pricing, texts } = d.content;
  return (
    <>
      <PageHero
        eyebrow="Book a session"
        title={textOf(texts, "book.title")}
        lede={textOf(texts, "book.lede")}
      >
        <p className="mt-5 text-sm text-muted">
          Already know what you want?{" "}
          <a href="#quick" className="font-semibold text-clay-deep underline">
            Send a quick inquiry
          </a>
          {publicEnv.contactEmail && (
            <>
              {" "}
              or email <ContactLink kind="email" value={publicEnv.contactEmail} className="font-semibold text-clay-deep underline" />
            </>
          )}
          .
        </p>
      </PageHero>

      <section aria-label="Session finder" className="pb-20">
        <Container>
          <div>
            <noscript>
              <p className="mb-6 rounded-xl border border-line bg-gallery p-4 text-muted">
                The session finder needs JavaScript. The quick inquiry form below works without it.
              </p>
            </noscript>
            <BookingWizard pricing={pricing} />
          </div>
        </Container>
      </section>

      <section id="quick" aria-labelledby="quick-title" className="scroll-mt-24 bg-gallery py-20">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Option B</p>
            <h2 id="quick-title" className="text-display-sm">
              Quick inquiry
            </h2>
            <p className="mt-4 text-muted">Name, email, a sentence about your idea. That&apos;s it.</p>
          </div>
          <div className="lg:col-span-8">
            <QuickInquiry idPrefix="book" />
          </div>
        </Container>
      </section>

      <section aria-labelledby="book-bys" className="py-20">
        <Container>
          <BuildYourStory photos={photos} pricing={pricing} title={textOf(texts, "home.bys.title")} headingId="book-bys" />
        </Container>
      </section>
    </>
  );
}
