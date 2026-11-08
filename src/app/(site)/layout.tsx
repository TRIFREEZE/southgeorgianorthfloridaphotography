import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { FlickLoader } from "@/components/flick/FlickLoader";
import { JsonLd } from "@/components/seo/JsonLd";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { getSiteData } from "@/lib/cms/data";
import { mosaicPhotos } from "@/lib/cms/resolve";
import { guideData } from "@/components/flick/guide-data";
import { businessJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const d = await getSiteData();
  const strip = mosaicPhotos(d, 6).map((p) => ({ id: p.id, src: p.src, alt: p.alt, tone: p.tone ?? 0, category: p.category, title: p.title, width: p.width, height: p.height }));
  const guide = guideData(d.content);

  return (
    <>
      {d.preview && <PreviewBanner />}
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-ink px-5 py-3 font-semibold text-gallery focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <RevealObserver />
      <FlickLoader filmStrip={strip} guide={guide} preview={d.preview} />
      <JsonLd data={[businessJsonLd(), websiteJsonLd()]} />
    </>
  );
}
