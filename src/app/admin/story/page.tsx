import { Suspense } from "react";
import { CmsUnavailable } from "@/components/admin/CmsUnavailable";
import { StoryEditor } from "@/components/admin/StoryEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { adminPhotos, draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { defaultStoryConfig } from "@/lib/cms/sessions";

export const metadata = { title: "Build your story" };

export default function StoryAdminPage() {
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
  const [content, photos] = await Promise.all([draftContent(repo), adminPhotos(repo)]);
  const defaults = defaultStoryConfig(content.texts);
  const initial = content.story ?? defaults;
  return (
    <div>
      <h1 className="text-display-sm">Build your story</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        The optional “Picture it first” builder on the homepage and Book page. Add, remove and reorder the buttons visitors tap, choose where each one leads, and link photos to them.
      </p>
      <div className="mt-8">
        <StoryEditor key={JSON.stringify(initial)} initial={initial} defaults={defaults} categories={content.categories} pricing={content.pricing} photos={photos.filter((p) => !p.pendingDelete)} />
      </div>
    </div>
  );
}
