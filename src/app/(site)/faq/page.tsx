import type { Metadata } from "next";
import { faqs, type Faq } from "@/content/faqs";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photography FAQ: Sessions, Pricing, Pets, Horses & Weddings",
  description: "Answers about session timing, pricing, weather, what to wear, photo rights, pets, horses, weddings and delivery.",
  path: "/faq",
});

const groups: { topic: Faq["topic"]; title: string }[] = [
  { topic: "session", title: "Sessions" },
  { topic: "pricing", title: "Pricing & travel" },
  { topic: "animals", title: "Pets & horses" },
  { topic: "events", title: "Weddings & events" },
  { topic: "delivery", title: "Your photos" },
  { topic: "rights", title: "Rights & printing" },
];

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Good questions, honest answers." />
      <Container className="space-y-14">
        {groups.map((g) => {
          const items = faqs.filter((f) => f.topic === g.topic);
          if (!items.length) return null;
          return (
            <section key={g.topic} aria-labelledby={`faq-${g.topic}`} className="grid gap-6 lg:grid-cols-12">
              <h2 id={`faq-${g.topic}`} className="text-display-sm lg:col-span-4">
                {g.title}
              </h2>
              <div className="lg:col-span-8">
                <FaqList items={items} />
              </div>
            </section>
          );
        })}
        <div className="text-center">
          <p className="text-muted">Didn&apos;t see your question?</p>
          <ButtonLink href="/contact" className="mt-4">
            Ask us directly <Arrow />
          </ButtonLink>
        </div>
      </Container>
      <JsonLd data={faqJsonLd()} />
    </>
  );
}
