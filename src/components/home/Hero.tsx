import { formatPrice, pricedPackages } from "@/content/pricing";
import type { Pricing } from "@/lib/cms/schema";
import { textOf } from "@/lib/cms/texts";
import type { Photo } from "@/lib/photo-types";
import { PhotoFill } from "@/components/media/Photo";
import { Arrow, ButtonLink, Container } from "@/components/ui/primitives";
import { RotatingWord } from "./RotatingWord";

export function Hero({ photo, texts, pricing }: { photo: Photo; texts: Record<string, string>; pricing: Pricing }) {
  const t = (k: string) => textOf(texts, k);
  const words = t("home.hero.headline").trim().split(/\s+/);
  // The last word can cycle through a list; trailing punctuation stays put.
  const last = words.at(-1) ?? "";
  const [, lastWord = last, suffix = ""] = last.match(/^(.*?)([.!?…,;:]*)$/) ?? [];
  const pool = t("home.hero.rotate")
    .split("\n")
    .map((w) => w.trim().replace(/[.!?…,;:]+$/, ""))
    .filter(Boolean);
  const rotating = pool.length > 1 ? [lastWord, ...pool.filter((w) => w.toLowerCase() !== lastWord.toLowerCase())] : [];
  const starting = pricedPackages(pricing.packages)[0]?.priceCents;
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* The text block is centred on the photo itself (its caption hangs below and isn't counted). */}
      <Container className="grid gap-8 pt-8 pb-16 sm:pt-12 md:grid-cols-12 md:items-center md:gap-10 lg:pt-16 lg:pb-28">
        <div className="md:col-span-7 lg:col-span-7">
          <h1 id="hero-title">
            <span className="eyebrow block max-w-md leading-relaxed">{t("home.hero.eyebrow")}</span>
            <span className="headline-reveal mt-5 block font-display text-display-xl leading-[0.98] tracking-[-0.025em]">
              {words.map((w, i) => (
                <span key={i} style={{ ["--i" as string]: i }} className={i === words.length - 1 && words.length > 1 ? "italic text-clay" : ""}>
                  {i === words.length - 1 && rotating.length > 1 ? <RotatingWord words={rotating} suffix={suffix} /> : w}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </h1>
          <div className="mt-9 flex flex-wrap items-center gap-3 lg:mt-11">
            <ButtonLink href="/portfolio">
              {t("home.hero.cta1")} <Arrow />
            </ButtonLink>
            <ButtonLink href="/book" variant="secondary">
              {t("home.hero.cta2")}
            </ButtonLink>
          </div>
          {pricing.status === "confirmed" && starting != null && <p className="mt-5 text-sm text-muted">{textOf(texts, "home.hero.price", { price: formatPrice(starting) })}</p>}
        </div>

        <div className="md:col-span-5 lg:col-span-5">
          <figure className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand shadow-[0_30px_60px_-30px_rgba(37,39,35,0.45)] md:aspect-[3/4]">
              <PhotoFill photo={photo} priority sizes="(min-width: 768px) 40vw, 100vw" quality={85} />
            </div>
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-xs text-muted md:absolute md:inset-x-0 md:top-full">
              <span>{photo.isSample ? "Hero photograph: replace it in Admin → Site photos" : photo.title}</span>
              <span className="font-display italic">{t("site.secondaryLine")}</span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
