"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUploadUrl, finalizeUpload } from "../actions";

type Item = { name: string; state: "waiting" | "uploading" | "processing" | "done" | "error"; error?: string };

export function Uploader() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const run = async (files: File[]) => {
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, state: "waiting" })));
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        update(i, { state: "uploading" });
        const signed = await createUploadUrl({ filename: f.name, type: f.type, size: f.size });
        if ("error" in signed && signed.error) throw new Error(signed.error);
        if (!("signedUrl" in signed) || !signed.signedUrl || !signed.path) throw new Error("No upload URL");
        const put = await fetch(signed.signedUrl, { method: "PUT", body: f, headers: { "content-type": f.type, "x-upsert": "false" } });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        update(i, { state: "processing" });
        const done = await finalizeUpload({ path: signed.path, filename: f.name });
        if (done && "error" in done && done.error) throw new Error(done.error);
        update(i, { state: "done" });
      } catch (e) {
        update(i, { state: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-dashed border-ink/30 bg-parchment p-6">
      <label className="block">
        <span className="font-semibold">Add photos</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          multiple
          disabled={busy}
          className="mt-3 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-ink file:px-5 file:font-semibold file:text-gallery"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void run(files);
            e.target.value = "";
          }}
        />
      </label>
      {items.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className={it.state === "error" ? "text-[#a3392b]" : "text-muted"}>
              {it.name}: {it.state === "error" ? it.error : it.state}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
