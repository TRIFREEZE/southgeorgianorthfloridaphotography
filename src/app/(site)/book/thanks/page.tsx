import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/content/site";
import { ButtonLink, Container } from "@/components/ui/primitives";
import { TrackView } from "@/components/ui/TrackView";
import { ThanksRef } from "./ThanksRef";

export const metadata: Metadata = {
  title: "Thank you: your note arrived",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <section className="py-24 sm:py-32">
      <TrackView event="confirmation_view" />
      <Container className="max-w-3xl text-center">
        <p className="eyebrow">Inquiry received</p>
        <h1 className="mt-5 text-display-lg">Thank you. Your note arrived.</h1>
        <p className="mx-auto mt-6 max-w-xl text-lede text-ink-soft">
          A real person will read it and reply personally, usually with a couple of questions and availability. This isn&apos;t a
          confirmed booking yet: nothing is reserved or charged until we&apos;ve agreed on the details together.
        </p>
        <Suspense fallback={null}>
          <ThanksRef />
        </Suspense>
        <p className="mt-4 text-sm text-muted">If you gave an email address, a copy of this confirmation is on its way (check spam just in case).</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/portfolio" variant="secondary">
            Browse the portfolio
          </ButtonLink>
          <ButtonLink href="/journal">Read a prep guide</ButtonLink>
        </div>
        <p className="mt-12 font-display text-xl italic text-clay-deep">{site.primaryLine}</p>
      </Container>
    </section>
  );
}
