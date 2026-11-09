import Link from "next/link";
import { Suspense } from "react";
import { GalleryComposer } from "@/components/admin/EmailComposer";
import { requireAdmin } from "@/lib/admin-auth";
import { getRepo } from "@/lib/cms/repo";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Send a gallery" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const repo = getRepo();
  const galleries = repo ? await repo.listGalleries().catch(() => []) : [];
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <Link href="/admin/emails" className="text-sm underline">
          ← Emails
        </Link>
        <h1 className="mt-2 text-display-sm">Gallery ready</h1>
        <p className="mt-2 text-muted">Drop in their gallery link and password and send. Works with galleries made here or anywhere else.</p>
      </header>
      <GalleryComposer
        galleries={galleries
          .filter((g) => g.active)
          .map((g) => ({ id: g.id, title: g.title, clientName: g.clientName, link: `${publicEnv.siteUrl}/client-gallery/${g.slug}`, expiresAt: g.expiresAt }))}
      />
    </div>
  );
}
