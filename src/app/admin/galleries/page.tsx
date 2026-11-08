import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { GalleryList } from "@/components/admin/Galleries";
import { requireAdmin } from "@/lib/admin-auth";
import { getRepo } from "@/lib/cms/repo";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Client galleries" };

export default function GalleriesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const repo = getRepo();
  if (!repo) return <CmsUnavailable />;
  const galleries = await repo.listGalleries();
  const withCounts = await Promise.all(galleries.map(async (g) => ({ id: g.id, slug: g.slug, title: g.title, clientName: g.clientName, message: g.message, expiresAt: g.expiresAt, allowDownloads: g.allowDownloads, active: g.active, createdAt: g.createdAt, photoCount: (await repo.listGalleryPhotos(g.id)).length })));
  return (
    <div>
      <h1 className="text-display-sm">Client galleries</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Private, password-protected galleries for delivering a client&apos;s photos. They never appear in your portfolio or in search results.</p>
      <div className="mt-8">
        <GalleryList galleries={withCounts} siteUrl={publicEnv.siteUrl} />
      </div>
    </div>
  );
}
