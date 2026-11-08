import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { sessionTypes } from "@/lib/cms/sessions";

export const metadata = { title: "Pricing & text" };

export default function ContentPage() {
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
  const c = await draftContent(repo);
  return (
    <div>
      <h1 className="text-display-sm">Pricing, page text, FAQs & testimonials</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Edits save as drafts. Use Preview to check them on desktop and mobile, then Publish.</p>
      <div className="mt-8">
        <ContentEditor pricing={c.pricing} texts={c.texts} faqs={c.faqs} testimonials={c.testimonials} services={sessionTypes(c, { includeHidden: true }).map((s) => ({ slug: s.slug, name: s.name }))} />
      </div>
    </div>
  );
}
