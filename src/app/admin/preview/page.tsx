import { Suspense } from "react";
import { PreviewFrames } from "@/components/admin/PreviewFrames";
import { services } from "@/content/services";
import { requireAdmin } from "@/lib/admin-auth";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";

export const metadata = { title: "Preview" };

export default function PreviewPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const repo = getRepo();
  const cats = repo ? (await draftContent(repo)).categories.filter((c) => c.visible) : [];
  const pages = [
    { path: "/", label: "Homepage" },
    { path: "/portfolio", label: "Portfolio (all)" },
    ...cats.map((c) => ({ path: `/portfolio/${c.slug}`, label: `Portfolio: ${c.label}` })),
    ...services.map((s) => ({ path: `/services/${s.slug}`, label: `Service: ${s.name}` })),
    { path: "/pricing", label: "Pricing" },
    { path: "/about", label: "About" },
    { path: "/experience", label: "Experience" },
    { path: "/faq", label: "FAQ" },
    { path: "/book", label: "Book" },
    { path: "/journal", label: "Journal" },
  ];
  return (
    <div>
      <h1 className="text-display-sm">Preview unpublished changes</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">This shows the site with your drafts, on a desktop and a phone. Only you can see it. When it looks right, press Publish in the bar above.</p>
      <div className="mt-8">
        <PreviewFrames pages={pages} />
      </div>
    </div>
  );
}
