import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { GalleryDetail } from "@/components/admin/Galleries";
import { requireAdmin } from "@/lib/admin-auth";
import { getRepo } from "@/lib/cms/repo";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Client gallery" };

export default function GalleryPage({ params }: PageProps<"/admin/galleries/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: Pick<PageProps<"/admin/galleries/[id]">, "params">) {
  await requireAdmin();
  const repo = getRepo();
  if (!repo) return <CmsUnavailable />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const g = await repo.getGallery(id);
  if (!g) notFound();
  const gallery = { id: g.id, slug: g.slug, title: g.title, clientName: g.clientName, message: g.message, expiresAt: g.expiresAt, allowDownloads: g.allowDownloads, active: g.active, createdAt: g.createdAt };
  const photos = await repo.listGalleryPhotos(id);
  const views = await Promise.all(
    photos.map(async (p) => ({ id: p.id, url: await repo.signedUrl("client-galleries", p.webPath, 3600), filename: p.filename, bytes: p.bytes, originalBytes: p.originalBytes })),
  );
  return (
    <div>
      <Link href="/admin/galleries" className="text-sm underline">
        ← All galleries
      </Link>
      <h1 className="mt-3 text-display-sm">{g.title}</h1>
      <div className="mt-8">
        <GalleryDetail gallery={gallery} photos={views} shareUrl={`${publicEnv.siteUrl}/client-gallery/${g.slug}`} />
      </div>
    </div>
  );
}
