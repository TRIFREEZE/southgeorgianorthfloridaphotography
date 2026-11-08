import { Suspense } from "react";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { requireAdmin } from "@/lib/admin-auth";
import { libraryData } from "@/lib/cms/admin-views";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";

export const metadata = { title: "Categories & sessions" };

export default function CategoriesPage() {
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
  const [{ photos, categories }, content] = await Promise.all([libraryData(repo), draftContent(repo)]);
  const counts: Record<string, number> = {};
  for (const p of photos) for (const id of new Set([p.state.categoryId, ...(p.state.alsoIn ?? [])])) if (id) counts[id] = (counts[id] ?? 0) + 1;
  return (
    <div>
      <h1 className="text-display-sm">Categories &amp; sessions</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Each category is a portfolio gallery and, unless you switch it off, a service page, a choice in the session finder and an entry on the pricing page. Open “Service &amp; booking setup” to choose packages or a custom quote and write its page. Drag to set the order everywhere. Changes go live when you publish. Deleting a category never deletes photos.
      </p>
      <div className="mt-8">
        <CategoryManager key={JSON.stringify(categories)} initial={categories} counts={counts} pricing={content.pricing} texts={content.texts} />
      </div>
    </div>
  );
}
