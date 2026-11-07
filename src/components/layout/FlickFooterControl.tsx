"use client";

import { setFlickHidden, useFlickPrefs } from "@/components/flick/prefs";
import { emitFlick } from "@/components/flick/bus";

/** Always-available way to bring Flick back (or send it away). */
export function FlickFooterControl() {
  const { hidden } = useFlickPrefs();
  return (
    <button
      type="button"
      className="min-h-11 underline decoration-sand/40 underline-offset-4 hover:text-gallery"
      onClick={() => {
        setFlickHidden(!hidden);
        if (hidden) emitFlick({ type: "show" });
      }}
    >
      {hidden ? "Show Flick, the site helper" : "Hide Flick"}
    </button>
  );
}
