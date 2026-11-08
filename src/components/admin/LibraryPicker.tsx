"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { AdminPhoto } from "@/lib/cms/ops";
import type { Category } from "@/lib/cms/schema";
import { Modal } from "./ui";

/** Choose an existing library photo for a spot on the site. */
export function LibraryPicker({ open, onClose, onPick, photos, categories, title = "Choose a photo", preferCategory }: { open: boolean; onClose: () => void; onPick: (id: string) => void; photos: AdminPhoto[]; categories: Category[]; title?: string; preferCategory?: string | null }) {
  const [cat, setCat] = useState<string>(preferCategory ?? "all");
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      photos.filter(
        (p) =>
          !p.pendingDelete &&
          (cat === "all" || (cat === "none" ? !p.state.categoryId : p.state.categoryId === cat || (p.state.alsoIn ?? []).includes(cat))) &&
          (!q || `${p.state.title} ${p.state.alt} ${p.state.filename}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [photos, cat, q],
  );
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="field !min-h-10 w-52" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="all">All photos</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="none">No category</option>
        </select>
        <input className="field !min-h-10 w-52" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>
      {list.length === 0 ? (
        <p className="py-10 text-center text-muted">No photos match. Upload some in the Photo library, or drop a file straight onto the spot.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" data-testid="picker-grid">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-sand ring-clay-deep hover:ring-2 focus-visible:ring-2"
                aria-label={`Use ${p.state.title || p.state.filename || "photo"}`}
              >
                <Image src={p.url} alt="" fill sizes="160px" quality={60} className="object-cover" style={{ objectPosition: `${p.state.focal.dx}% ${p.state.focal.dy}%` }} />
                {!p.state.published && <span className="absolute bottom-1 left-1 rounded bg-ink/75 px-1.5 text-[0.65rem] font-bold text-gallery">Hidden</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
