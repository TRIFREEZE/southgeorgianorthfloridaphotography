"use client";

import { useEffect } from "react";

/**
 * Scroll reveals with one IntersectionObserver for the whole site. Elements opt in
 * with `data-reveal` (fade/rise) or `data-reveal="crop"` (editorial crop-open).
 * Opacity/transform/clip-path only, so reveals never cause layout shift.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal", "reveal-ready");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = (scope: ParentNode) =>
      scope.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)").forEach((el) => io.observe(el));
    scan(document);
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            if (n.matches("[data-reveal]")) io.observe(n);
            scan(n);
          }
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
