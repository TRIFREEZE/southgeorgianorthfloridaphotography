import type { Metadata } from "next";
import type { Faq } from "@/lib/cms/schema";
import { getSiteData, getT } from "@/lib/cms/data";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photography FAQ: Sessions, Pricing, Pets, Horses & Weddings",
  description: "Answers about session timing, pricing, weather, what to wear, photo rights, pets, horses, weddings and delivery.",
  path: "/faq",
});

const TOPICS: Faq["topic"][] = ["session", "pricing", "animals", "events", "delivery", "rights"];

export default async function FaqPage() {
  const faqs = (await getSiteData()).content.faqs.filter((f) => f.faqPage);
  const t = await getT();
  const groups = TOPICS.map((topic) => ({ topic, title: t(`faq.topic.${topic}`) }));
  return (
    <>
      <PageHero eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
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
          <p className="text-muted">{t("faq.more")}</p>
          <ButtonLink href="/contact" className="mt-4">
            {t("faq.moreCta")} <Arrow />
          </ButtonLink>
        </div>
      </Container>
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
    </>
  );
}
