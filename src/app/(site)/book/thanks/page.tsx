import type { Metadata } from "next";
import { Suspense } from "react";
import { getT } from "@/lib/cms/data";
import { ButtonLink, Container } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { ThanksRef } from "./ThanksRef";

export const metadata: Metadata = {
  title: "Thank you: your note arrived",
  robots: { index: false, follow: false },
};

export default async function ThanksPage() {
  const t = await getT();
  return (
    <section className="py-24 sm:py-32">
      <TrackView event="confirmation_view" />
      <Container className="max-w-3xl text-center">
        <p className="eyebrow">{t("thanks.eyebrow")}</p>
        <h1 className="mt-5 text-display-lg">{t("thanks.title")}</h1>
        <p className="mx-auto mt-6 max-w-xl text-lede text-ink-soft">{t("thanks.body")}</p>
        <Suspense fallback={null}>
          <ThanksRef />
        </Suspense>
        <p className="mt-4 text-sm text-muted">{t("thanks.email")}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/portfolio" variant="secondary">
            {t("thanks.cta1")}
          </ButtonLink>
          <ButtonLink href="/journal">{t("thanks.cta2")}</ButtonLink>
        </div>
        <p className="mt-12 font-display text-xl italic text-clay-deep">{t("site.primaryLine")}</p>
      </Container>
    </section>
  );
}
