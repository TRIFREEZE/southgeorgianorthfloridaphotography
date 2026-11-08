import { Suspense } from "react";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { requireAdmin } from "@/lib/admin-auth";
import { libraryData } from "@/lib/cms/admin-views";
import { getRepo } from "@/lib/cms/repo";

export const metadata = { title: "Categories" };

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
  const { photos, categories } = await libraryData(repo);
  const counts: Record<string, number> = {};
  for (const p of photos) if (p.state.categoryId) counts[p.state.categoryId] = (counts[p.state.categoryId] ?? 0) + 1;
  return (
    <div>
      <h1 className="text-display-sm">Portfolio categories</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Drag to set the order of the portfolio filters and homepage story cards. Renaming or changing a web address takes effect when you publish. Deleting a category never deletes photos.</p>
      <div className="mt-8">
        <CategoryManager key={categories.map((c) => `${c.id}:${c.slug}:${c.label}:${c.visible}`).join("|")} initial={categories} counts={counts} />
      </div>
    </div>
  );
}
