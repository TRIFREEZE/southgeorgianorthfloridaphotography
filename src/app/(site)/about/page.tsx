import type { Metadata } from "next";
import { site } from "@/content/site";
import { PhotoFill } from "@/components/media/Photo";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";
import { getSiteData, getT } from "@/lib/cms/data";
import { aboutPhotos, founderPhoto } from "@/lib/cms/resolve";
import { editedAboutValues } from "@/lib/cms/texts";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: "About the Photographer",
    description: `${t("about.lead")} Meet the creator behind ${site.shortName}: unhurried, natural-light photography across South Georgia and North Florida.`,
    path: "/about",
  });
}

/** Every word and photo on this page is editable in /admin (Page text → About page; Site photos → About page). */
export default async function AboutPage() {
  const d = await getSiteData();
  const t = await getT();
  const portrait = founderPhoto(d);
  const extra = aboutPhotos(d);
  const values = editedAboutValues(t.texts);
  const name = t("about.name");
  const role = t("about.role");
  return (
    <>
      <section className="pt-14 pb-16 sm:pt-20 lg:pt-28">
        <Container className="grid gap-12 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="eyebrow mb-5">
              {t("about.eyebrow")}
              {name ? ` · ${name}` : ""}
            </p>
            <h1 className="text-display-lg">{t("about.lead")}</h1>
            <p className="mt-6 max-w-xl text-lede text-muted">{t("about.short")}</p>
          </div>
          <div className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand">
              <PhotoFill photo={portrait} priority sizes="(min-width: 768px) 40vw, 100vw" />
            </div>
            <p className="mt-3 text-sm text-muted">{name ? `${name}, ${role.toLowerCase()}` : role}</p>
          </div>
        </Container>
      </section>

      <section className="pb-20" aria-labelledby="story-title">
        <Container className="grid gap-10 lg:grid-cols-12">
          <h2 id="story-title" className="text-display-sm lg:col-span-4">
            {t("about.storyTitle")}
          </h2>
          <div className="prose-rcl text-lede lg:col-span-7 lg:col-start-6">
            {t.paras("about.story").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </Container>
      </section>

      {extra.length > 0 && (
        <section className="pb-20" aria-labelledby="about-photos-title">
          <Container>
            <h2 id="about-photos-title" className="text-display-sm">
              {t("about.photosTitle")}
            </h2>
            <ul className={`mt-8 grid gap-4 ${extra.length === 1 ? "sm:grid-cols-1 sm:max-w-md" : extra.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {extra.map((p) => (
                <li key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-sand" data-reveal="crop">
                  <PhotoFill photo={p} sizes="(min-width: 640px) 33vw, 100vw" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-gallery py-20" aria-labelledby="values-title">
        <Container>
          <h2 id="values-title" className="text-display-md">
            {t("about.valuesTitle")}
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {values.map((v, i) => (
              <li key={i} className="border-t border-ink pt-6" data-reveal>
                <h3 className="text-[1.6rem]">{v.title}</h3>
                <p className="mt-2 text-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-20 text-center">
        <Container>
          <p className="font-display text-display-sm italic">{t("about.closing")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/portfolio" variant="secondary">
              {t("about.cta1")}
            </ButtonLink>
            <ButtonLink href="/book">
              {t("about.cta2")} <Arrow />
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
