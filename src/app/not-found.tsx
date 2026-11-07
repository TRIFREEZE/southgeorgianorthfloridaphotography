import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { FlickSVG } from "@/components/flick/FlickSVG";
import { ButtonLink, Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="py-20 sm:py-28">
        <Container className="grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="eyebrow">404</p>
            <h1 className="mt-4 text-display-lg">This page wandered off the map.</h1>
            <p className="mt-6 max-w-lg text-lede text-muted">
              The link may be old, or the page may have moved. Flick brought a map, which is optimistic of him.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/">Back to the homepage</ButtonLink>
              <ButtonLink href="/portfolio" variant="secondary">
                See the photography
              </ButtonLink>
              <ButtonLink href="/book" variant="secondary">
                Book a session
              </ButtonLink>
            </div>
          </div>
          <div className="flex justify-center md:col-span-5">
            <FlickSVG prop="map" mood="curious" className="h-48 w-48 sm:h-64 sm:w-64" title="Flick, the site's little lens mascot, holding a tiny map" />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
