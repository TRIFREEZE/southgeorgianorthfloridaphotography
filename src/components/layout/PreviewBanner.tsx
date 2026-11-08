/**
 * Shown only while the owner is previewing unpublished CMS changes (draft mode).
 * Visitors never see it: draft mode requires an admin session to switch on.
 */
export function PreviewBanner() {
  return (
    <div role="status" className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-clay-deep px-4 py-2 text-center text-sm font-semibold text-gallery">
      <span>Preview: you&apos;re seeing unpublished changes. Visitors still see the live site.</span>
      <span className="flex gap-3">
        <a href="/admin" className="underline underline-offset-2">
          Back to dashboard
        </a>
        <a href="/api/preview/disable" className="underline underline-offset-2" data-testid="exit-preview">
          Exit preview
        </a>
      </span>
    </div>
  );
}
