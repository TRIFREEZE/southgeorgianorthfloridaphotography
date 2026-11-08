import { formatPrice } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import { textOf } from "@/lib/cms/texts";
import type { Photo } from "@/lib/photo-types";
import { PhotoFill } from "@/components/media/Photo";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";

export function Hero({ photo, texts, pricing }: { photo: Photo; texts: Record<string, string>; pricing: Pricing }) {
  const t = (k: string) => textOf(texts, k);
  const words = t("home.hero.headline").trim().split(/\s+/);
  const starting = Math.min(...pricing.packages.map((p) => p.priceCents));
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <Container className="grid items-end gap-8 pt-8 pb-14 sm:pt-12 md:grid-cols-12 md:gap-10 lg:pt-16 lg:pb-24">
        <div className="md:col-span-7 lg:col-span-7 md:pb-6">
          <h1 id="hero-title">
            <span className="eyebrow block max-w-md leading-relaxed">{t("home.hero.eyebrow")}</span>
            <span className="headline-reveal mt-5 block font-display text-display-xl leading-[0.98] tracking-[-0.025em]">
              {words.map((w, i) => (
                <span key={i} style={{ ["--i" as string]: i }} className={i === words.length - 1 && words.length > 1 ? "italic text-clay" : ""}>
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lede text-muted">{t("home.hero.lede")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/portfolio">
              {t("home.hero.cta1")} <Arrow />
            </ButtonLink>
            <ButtonLink href="/book" variant="secondary">
              {t("home.hero.cta2")}
            </ButtonLink>
          </div>
          {pricing.status === "confirmed" && <p className="mt-5 text-sm text-muted">Portrait sessions from {formatPrice(starting)}.</p>}
        </div>

        <div className="md:col-span-5 lg:col-span-5">
          <figure className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand shadow-[0_30px_60px_-30px_rgba(37,39,35,0.45)] md:aspect-[3/4]">
              <PhotoFill photo={photo} priority sizes="(min-width: 768px) 40vw, 100vw" quality={85} />
            </div>
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-xs text-muted">
              <span>{photo.isSample ? "Hero photograph: replace it in Admin → Site photos" : photo.title}</span>
              <span className="font-display italic">Real moments. Beautifully kept.</span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
