import type { Metadata } from "next";
import { getSiteData } from "@/lib/cms/data";
import { editedExperience, textOf } from "@/lib/cms/texts";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Approach: Unhurried Photography Sessions",
  description:
    "How a Southstill session works, from first note to private gallery: planning the light and location, relaxed direction, weather plans and delivery.",
  path: "/experience",
});

export default async function ExperiencePage() {
  const { content } = await getSiteData();
  const { pricing, faqs, texts } = content;
  const t = (k: string) => textOf(texts, k);
  const { steps: experienceSteps, prep } = editedExperience(texts);
  return (
    <>
      <PageHero eyebrow={t("experience.eyebrow")} title={t("experience.title")} lede={t("experience.lede")} />

      <section aria-labelledby="steps-title" className="pb-20">
        <Container>
          <h2 id="steps-title" className="sr-only">
            The four steps
          </h2>
          <ol className="space-y-4">
            {experienceSteps.map((s, i) => (
              <li key={s.n} className="grid gap-4 rounded-[1.3rem] border border-line bg-gallery p-6 sm:p-8 md:grid-cols-12 md:items-baseline" data-reveal style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
                <p className="font-display text-[2.4rem] leading-none text-clay md:col-span-1">{s.n}</p>
                <h3 className="text-[1.75rem] md:col-span-4">{s.title}</h3>
                <p className="text-ink-soft md:col-span-7">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="time-title" className="bg-ink py-20 text-gallery on-dark sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">{t("experience.time.eyebrow")}</p>
            <h2 id="time-title" className="text-display-md">
              {t("experience.time.title")}
            </h2>
          </div>
          <div className="space-y-4 text-sand lg:col-span-7">
            <p className="text-lede text-gallery">{pricing.noStopwatch.body}</p>
            <p>{pricing.noStopwatch.boundaries}</p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="prep-title" className="py-20 sm:py-24">
        <Container>
          <h2 id="prep-title" className="text-display-md">
            {t("experience.prep.title")}
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {prep.map((p) => (
              <div key={p.title + p.items.length} className="border-t border-ink pt-6" data-reveal>
                <h3 className="text-[1.6rem]">{p.title}</h3>
                <ul className="mt-4 space-y-2.5 text-ink-soft">
                  {p.items.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-clay" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 text-muted">{textOf(texts, "delivery.turnaround")}</p>
        </Container>
      </section>

      <section aria-labelledby="exp-faq" className="pb-8">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="exp-faq" className="text-display-sm">
              {t("experience.faqTitle")}
            </h2>
            <ButtonLink href="/book" className="mt-8">
              {t("experience.cta")} <Arrow />
            </ButtonLink>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={faqs.filter((f) => ["awkward", "weather", "what-to-wear", "pets-move", "edits"].includes(f.id))} />
          </div>
        </Container>
      </section>
    </>
  );
}
