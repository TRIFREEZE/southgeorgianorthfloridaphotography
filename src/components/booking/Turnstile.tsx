"use client";

import { useEffect, useRef } from "react";
import { publicEnv } from "@/lib/env";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    __rclTurnstileLoading?: Promise<void>;
  }
}

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (window.__rclTurnstileLoading) return window.__rclTurnstileLoading;
  window.__rclTurnstileLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile failed to load"));
    document.head.appendChild(s);
  });
  return window.__rclTurnstileLoading;
}

/**
 * Optional Cloudflare Turnstile bot check. Renders nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; verified server-side with TURNSTILE_SECRET_KEY.
 */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const key = publicEnv.turnstileSiteKey;

  useEffect(() => {
    if (!key || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        idRef.current = window.turnstile.render(ref.current, {
          sitekey: key,
          theme: "light",
          appearance: "interaction-only",
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(""),
        });
      })
      .catch(() => {
        /* Server still enforces honeypot + rate limits; it reports if verification is required. */
      });
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [key, onToken]);

  useEffect(() => {
    if (resetKey && idRef.current && window.turnstile) window.turnstile.reset(idRef.current);
  }, [resetKey]);

  if (!key) return null;
  return <div ref={ref} className="min-h-0" />;
}
