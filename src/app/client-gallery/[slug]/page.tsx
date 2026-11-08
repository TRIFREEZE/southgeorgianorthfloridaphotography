import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Lockup } from "@/components/ui/Logo";
import { galleryCookie, hasAccess, isAvailable } from "@/lib/cms/galleries";
import { getRepo } from "@/lib/cms/repo";
import { lockGallery } from "./actions";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = {
  title: "Private gallery",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function ClientGalleryPage({ params }: PageProps<"/client-gallery/[slug]">) {
  return (
    <div className="min-h-dvh bg-gallery">
      <header className="border-b border-line bg-parchment">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Lockup />
          <span className="text-sm text-muted">Private gallery</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Body params={params} />
        </Suspense>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-display-sm">This gallery isn&apos;t available</h1>
      <p className="mt-3 text-ink-soft">The link may have expired or the gallery was closed. Please reach out to your photographer for a fresh link.</p>
    </div>
  );
}

async function Body({ params }: Pick<PageProps<"/client-gallery/[slug]">, "params">) {
  const { slug } = await params;
  const repo = getRepo();
  if (!repo || !/^[a-z0-9-]{3,80}$/.test(slug)) return <Unavailable />;
  const g = await repo.getGalleryBySlug(slug);
  if (!g || !isAvailable(g)) return <Unavailable />;

  const token = (await cookies()).get(galleryCookie(g.id))?.value;
  if (!hasAccess(g, token)) {
    return (
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Private gallery</p>
        <h1 className="mt-3 text-display-sm">{g.title}</h1>
        <p className="mt-3 text-ink-soft">Enter the password your photographer sent you.</p>
        <UnlockForm slug={slug} />
      </div>
    );
  }

  const photos = await repo.listGalleryPhotos(g.id);
  const views = await Promise.all(
    photos.map(async (p, i) => ({
      id: p.id,
      w: p.width,
      h: p.height,
      blur: p.blur,
      src: await repo.signedUrl("client-galleries", p.webPath, 3600),
      download: g.allowDownloads ? await repo.signedUrl("client-galleries", p.originalPath, 3600, p.filename ?? `photo-${i + 1}.jpg`) : null,
      name: p.filename ?? `Photo ${i + 1}`,
    })),
  );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your photos</p>
          <h1 className="mt-2 text-display-sm" data-testid="gallery-heading">
            {g.title}
          </h1>
          {g.message && <p className="mt-3 max-w-2xl whitespace-pre-line text-ink-soft">{g.message}</p>}
          {g.expiresAt && <p className="mt-2 text-sm text-muted">Available until {new Date(g.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>}
        </div>
        <form action={lockGallery}>
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className="rounded-full border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink">
            Lock gallery
          </button>
        </form>
      </div>
      {views.length === 0 ? (
        <p className="mt-12 text-center text-muted">Your photos are on their way. Check back soon.</p>
      ) : (
        <ul className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3" data-testid="client-photos">
          {views.map((v) => (
            <li key={v.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img src={v.src} alt={v.name} width={v.w} height={v.h} loading="lazy" className="h-auto w-full" style={v.blur ? { backgroundImage: `url(${v.blur})`, backgroundSize: "cover" } : undefined} />
              {v.download && (
                <a href={v.download} aria-label={`Download ${v.name} (full resolution)`} className="flex min-h-11 items-center justify-between bg-parchment px-3 text-sm font-semibold hover:bg-gallery" download>
                  <span className="truncate">{v.name}</span>
                  <span aria-hidden>↓ Download</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
