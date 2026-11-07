import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminPhotos } from "@/lib/admin-data";
import { publicStorageUrl } from "@/lib/supabase/server";
import { PhotoEditor } from "./PhotoEditor";
import { Uploader } from "./Uploader";

export const metadata = { title: "Photos" };
// Image processing (sharp) on large originals can take a few seconds.
export const maxDuration = 60;

export default function PhotosPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading photos…</p>}>
      <Photos />
    </Suspense>
  );
}

async function Photos() {
  await requireAdmin();
  const photos = await listAdminPhotos();
  const live = photos.filter((p) => p.published).length;
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm">Portfolio photos</h1>
        <p className="mt-2 max-w-3xl text-muted">
          Upload originals (JPEG/PNG/WebP/AVIF/TIFF, up to 50 MB). Each is auto-rotated, resized to a 3000px master, stripped of
          EXIF/GPS metadata and served as responsive AVIF/WebP. New uploads start unpublished: add alt text, confirm the
          license/permission, then publish. {live} of {photos.length} live.
        </p>
      </div>
      <Uploader />
      <ul className="grid gap-6 md:grid-cols-2">
        {photos.map((p) => (
          <li key={p.id}>
            <PhotoEditor photo={p} src={publicStorageUrl(p.storage_path)} />
          </li>
        ))}
      </ul>
      {photos.length === 0 && <p className="text-muted">No photos yet. Until you publish some, the public site shows labeled sample placeholders.</p>}
    </div>
  );
}
