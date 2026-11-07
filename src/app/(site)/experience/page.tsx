import type { Metadata } from "next";
import { experienceSteps, processHeadline } from "@/content/experience";
import { faqs } from "@/content/faqs";
import { pricing } from "@/content/pricing";
import { site } from "@/content/site";
import { FaqList } from "@/components/ui/FaqList";
import { Arrow, ButtonLink, Container, PageHero } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Approach: Unhurried Photography Sessions",
  description:
    "How a Red Clay & Light session works, from first note to private gallery: planning the light and location, relaxed direction, weather plans and delivery.",
  path: "/experience",
});

const prep = [
  { title: "Before", items: ["A quick call or messages to plan the idea", "Location and time chosen around the best light", "A simple wardrobe and prep guide", "A weather backup plan"] },
  { title: "During", items: ["Prompts and gentle direction, never stiff posing", "Breaks for little ones, animals and humans", "Safety first around horses, livestock and traffic", "No countdown for standard portraits"] },
  { title: "After", items: ["Carefully edited, natural-looking photos", "A private online gallery to download and share", "Personal-use print release for portraits", "Option to add extra photos from your gallery"] },
];

export default function ExperiencePage() {
  return (
    <>
      <PageHero eyebrow="Our approach" title={processHeadline} lede="Good photographs come from people feeling at ease. Everything about how we work is built around giving you the time and calm to get there." />

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
            <p className="eyebrow mb-4">On time</p>
            <h2 id="time-title" className="text-display-md">
              We have time.
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
            What to expect
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {prep.map((p) => (
              <div key={p.title} className="border-t border-ink pt-6" data-reveal>
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
          <p className="mt-10 text-muted">{site.turnaroundCopy ?? site.provisionalTurnaroundCopy}</p>
        </Container>
      </section>

      <section aria-labelledby="exp-faq" className="pb-8">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="exp-faq" className="text-display-sm">
              Common worries, answered
            </h2>
            <ButtonLink href="/book" className="mt-8">
              Start planning <Arrow />
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
