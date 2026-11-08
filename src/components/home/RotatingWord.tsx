"use client";

import { useEffect, useState } from "react";

/**
 * The last word of the hero headline, gently cycling through the owner's list
 * (edited in /admin → All site text → Homepage). Screen readers hear one stable
 * sentence; reduced-motion visitors just see the first word.
 */
export function RotatingWord({ words, suffix = "", interval = 2600 }: { words: string[]; suffix?: string; interval?: number }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setPhase("out");
      t = setTimeout(() => {
        setI((x) => (x + 1) % words.length);
        setPhase("in");
        t = setTimeout(tick, interval);
      }, 380);
    };
    t = setTimeout(tick, interval + 900);
    return () => clearTimeout(t);
  }, [words.length, interval]);

  // Reserve the width of the longest word so the line never reflows.
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), words[0] ?? "");
  return (
    <span className="relative inline-grid align-baseline">
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
        {longest}
        {suffix}
      </span>
      <span
        key={i}
        aria-hidden
        className="col-start-1 row-start-1 whitespace-nowrap"
        style={{
          transition: "opacity 360ms var(--ease-out-soft), transform 380ms var(--ease-out-soft), filter 380ms",
          opacity: phase === "in" ? 1 : 0,
          transform: phase === "in" ? "none" : "translateY(-0.28em)",
          filter: phase === "in" ? "none" : "blur(3px)",
          animation: phase === "in" && i > 0 ? "rotate-word-in 420ms var(--ease-out-soft) both" : undefined,
        }}
        data-testid="rotating-word"
      >
        {words[i]}
        {suffix}
      </span>
      <span className="sr-only">
        {words[0]}
        {suffix}
      </span>
    </span>
  );
}
