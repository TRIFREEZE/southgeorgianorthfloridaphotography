import type { Metadata } from "next";
import { about } from "@/content/about";
import { site } from "@/content/site";
import { PhotoFill } from "@/components/media/Photo";
import { SamplePlate } from "@/components/media/SamplePlate";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";
import { getSiteData } from "@/lib/cms/data";
import { founderPhoto } from "@/lib/cms/resolve";
import { textOf } from "@/lib/cms/texts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About the Photographer",
  description: `${about.lead} Meet the creator behind ${site.shortName}: unhurried, natural-light photography across South Georgia and North Florida.`,
  path: "/about",
});

export default async function AboutPage() {
  const d = await getSiteData();
  const portrait = founderPhoto(d);
  const t = (k: string) => textOf(d.content.texts, `about.${k}`);
  const name = t("name");
  const role = t("role");
  const story = t("story").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      <section className="pt-14 pb-16 sm:pt-20 lg:pt-28">
        <Container className="grid gap-12 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="eyebrow mb-5">About{name ? ` · ${name}` : ""}</p>
            <h1 className="text-display-lg">{t("lead")}</h1>
            <p className="mt-6 max-w-xl text-lede text-muted">{t("short")}</p>
          </div>
          <div className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand">
              {portrait ? (
                <PhotoFill photo={portrait} priority sizes="(min-width: 768px) 40vw, 100vw" />
              ) : (
                <SamplePlate photo={{ id: "about-fallback", category: "about", title: "Founder portrait", tone: 15, width: 4, height: 5 }} />
              )}
            </div>
            <p className="mt-3 text-sm text-muted">{name ? `${name}, ${role.toLowerCase()}` : role}</p>
          </div>
        </Container>
      </section>

      <section className="pb-20" aria-labelledby="story-title">
        <Container className="grid gap-10 lg:grid-cols-12">
          <h2 id="story-title" className="text-display-sm lg:col-span-4">
            The short version of a longer story
          </h2>
          <div className="prose-rcl text-lede lg:col-span-7 lg:col-start-6">
            {story.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-gallery py-20" aria-labelledby="values-title">
        <Container>
          <h2 id="values-title" className="text-display-md">
            How I work
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {about.values.map((v) => (
              <li key={v.title} className="border-t border-ink pt-6" data-reveal>
                <h3 className="text-[1.6rem]">{v.title}</h3>
                <p className="mt-2 text-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-20 text-center">
        <Container>
          <p className="font-display text-display-sm italic">{site.primaryLine}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/portfolio" variant="secondary">
              See the photography
            </ButtonLink>
            <ButtonLink href="/book">
              Book a session <Arrow />
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
