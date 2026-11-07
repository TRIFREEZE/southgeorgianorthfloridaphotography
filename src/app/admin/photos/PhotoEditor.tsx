"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { AdminPhoto } from "@/lib/admin-data";
import { deletePhoto, updatePhoto, type ActionState } from "../actions";

const cats = [
  ["people", "People & Families"],
  ["animals", "Pets & Horses"],
  ["weddings-events", "Weddings & Celebrations"],
  ["brands", "Businesses & Brands"],
  ["about", "About / founder (not in portfolio)"],
] as const;

const licenses = [
  ["pending", "Not confirmed yet"],
  ["owner_original", "My original, no identifiable clients"],
  ["client_release", "Client gave permission to share"],
  ["model_release", "Signed model release"],
  ["licensed", "Licensed for this use"],
] as const;

export function PhotoEditor({ photo: p, src }: { photo: AdminPhoto; src: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePhoto, {});
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-parchment">
      <div className="relative aspect-[4/3] bg-sand">
        <Image src={src} alt={p.alt || "Unlabeled upload"} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" style={{ objectPosition: `${p.focal_x}% ${p.focal_y}%` }} />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${p.published ? "bg-moss-deep text-gallery" : "bg-ink/80 text-gallery"}`}>
          {p.published ? "Live" : "Draft"}
          {p.hero ? " · Hero" : ""}
          {p.featured ? " · Featured" : ""}
        </span>
      </div>
      <form action={action} className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <input type="hidden" name="id" value={p.id} />
        <label className="sm:col-span-2">
          Alt text <span className="text-muted">(describe what&apos;s in the photo, required to publish)</span>
          <input name="alt" defaultValue={p.alt} maxLength={300} className="field mt-1" placeholder="Bay mare and her rider at sunset in a pecan orchard" />
        </label>
        <label>
          Category
          <select name="category" defaultValue={p.category} className="field mt-1">
            {cats.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategory
          <input name="subcategory" defaultValue={p.subcategory ?? ""} className="field mt-1" placeholder="Horses, Families, Headshots…" />
        </label>
        <label>
          Title
          <input name="title" defaultValue={p.title ?? ""} className="field mt-1" />
        </label>
        <label>
          Location <span className="text-muted">(only if true)</span>
          <input name="location" defaultValue={p.location ?? ""} className="field mt-1" placeholder="Thomasville, GA" />
        </label>
        <label>
          Capture date
          <input name="capture_date" type="date" defaultValue={p.capture_date ?? ""} className="field mt-1" />
        </label>
        <label>
          Sort order <span className="text-muted">(lower first)</span>
          <input name="sort_order" type="number" min={0} defaultValue={p.sort_order} className="field mt-1" />
        </label>
        <label>
          Focal point X %
          <input name="focal_x" type="number" min={0} max={100} defaultValue={p.focal_x} className="field mt-1" />
        </label>
        <label>
          Focal point Y %
          <input name="focal_y" type="number" min={0} max={100} defaultValue={p.focal_y} className="field mt-1" />
        </label>
        <label className="sm:col-span-2">
          Story / caption
          <textarea name="story_text" defaultValue={p.story_text ?? ""} rows={2} className="field mt-1" />
        </label>
        <label>
          License / permission
          <select name="license_status" defaultValue={p.license_status} className="field mt-1">
            {licenses.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Permission note
          <input name="permission_note" defaultValue={p.permission_note ?? ""} className="field mt-1" placeholder="Release signed 10/12" />
        </label>
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          {(
            [
              ["published", "Published", p.published],
              ["featured", "Featured", p.featured],
              ["hero", "Homepage hero", p.hero],
            ] as const
          ).map(([n, l, v]) => (
            <label key={n} className="inline-flex min-h-11 items-center gap-2">
              <input type="checkbox" name={n} defaultChecked={v} className="h-5 w-5 accent-[var(--color-clay-deep)]" /> {l}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded-full bg-ink px-5 font-semibold text-gallery disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
          {state.error && <span className="text-[#a3392b]" role="alert">{state.error}</span>}
          {state.message && <span className="text-moss-deep" role="status">{state.message}</span>}
        </div>
      </form>
      <form action={deletePhoto} className="border-t border-line px-4 py-3 text-right">
        <input type="hidden" name="id" value={p.id} />
        <button className="text-sm text-[#a3392b] underline" onClick={(e) => !window.confirm("Delete this photo permanently?") && e.preventDefault()}>
          Delete photo
        </button>
      </form>
    </div>
  );
}
