import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { Library } from "@/components/admin/Library";
import { requireAdmin } from "@/lib/admin-auth";
import { libraryData } from "@/lib/cms/admin-views";
import { getRepo } from "@/lib/cms/repo";

export const metadata = { title: "Photo library" };

export default function LibraryPage() {
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
  const { photos, categories } = await libraryData(repo);
  return (
    <div>
      <h1 className="text-display-sm">Photo library</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Upload in bulk, sort into categories, drag to reorder, and click any photo to crop it for desktop and mobile or edit its text.</p>
      <div className="mt-8">
        <Library photos={photos} categories={categories} />
      </div>
    </div>
  );
}
