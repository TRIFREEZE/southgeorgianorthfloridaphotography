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
    title: "About the Founders",
    description: `${t("about.lead")} Meet the founders behind ${site.shortName}: unhurried, natural-light photography across South Georgia and North Florida.`,
    path: "/about",
  });
}

/** Every word and photo on this page is editable in /admin (Page text → About page; Site photos → About page). */
export default async function AboutPage() {
  const d = await getSiteData();
  const t = await getT();
  const extra = aboutPhotos(d);
  const values = editedAboutValues(t.texts);
  const founders = ([1, 2] as const).map((n) => {
    const sfx = n === 1 ? "" : "2";
    return { n, photo: founderPhoto(d, n), name: t(`about.name${sfx}`), role: t(`about.role${sfx}`), story: t.paras(`about.story${sfx}`) };
  });
  return (
    <>
      <section className="pt-14 pb-14 sm:pt-20 lg:pt-28">
        <Container>
          <div className="max-w-4xl">
            <p className="eyebrow mb-5">{t("about.eyebrow")}</p>
            <h1 className="text-display-lg">{t("about.lead")}</h1>
            <p className="mt-6 max-w-2xl text-lede text-muted">{t("about.short")}</p>
          </div>
        </Container>
      </section>

      <section className="pb-20" aria-labelledby="founders-title">
        <Container>
          <h2 id="founders-title" className="text-display-sm">
            {t("about.foundersTitle")}
          </h2>
          <ul className="mt-10 grid gap-14 md:grid-cols-2 md:gap-10 lg:gap-16">
            {founders.map((f, i) => (
              <li key={f.n} className={i === 1 ? "md:mt-16" : ""} data-testid={`founder-${f.n}`}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand" data-reveal="crop">
                  <PhotoFill photo={f.photo} priority={i === 0} sizes="(min-width: 768px) 45vw, 100vw" />
                </div>
                <p className="eyebrow mt-6">{f.role}</p>
                <h3 className="mt-2 text-[2.1rem] leading-tight">{f.name || f.role}</h3>
                <div className="prose-rcl mt-4 text-[1.05rem] text-ink-soft">
                  {f.story.map((para, j) => (
                    <p key={j}>{para}</p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {extra.length > 0 && (
        <section className="pb-20" aria-labelledby="about-photos-title">
          <Container>
            <h2 id="about-photos-title" className="text-display-sm">
              {t("about.photosTitle")}
            </h2>
            <ul className={`mt-8 grid gap-4 ${extra.length === 1 ? "sm:max-w-md sm:grid-cols-1" : extra.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
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
