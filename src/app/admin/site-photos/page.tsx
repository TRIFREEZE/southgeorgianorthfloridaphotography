import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { SlotBoard } from "@/components/admin/SlotBoard";
import { requireAdmin } from "@/lib/admin-auth";
import { libraryData, siteSlots } from "@/lib/cms/admin-views";
import { getRepo } from "@/lib/cms/repo";

export const metadata = { title: "Site photos" };

export default function SitePhotosPage() {
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
  const [slots, { photos, categories }] = await Promise.all([siteSlots(repo), libraryData(repo)]);
  return (
    <div>
      <h1 className="text-display-sm">Site photos</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Every photo spot on the website. Drop a file onto a card to replace it, or choose one from your library. “Automatic” spots pick your featured photos for you.</p>
      <div className="mt-8">
        <SlotBoard slots={slots} photos={photos} categories={categories} />
      </div>
    </div>
  );
}
