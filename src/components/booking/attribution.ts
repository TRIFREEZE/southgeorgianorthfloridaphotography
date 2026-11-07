"use client";

/**
 * First-touch attribution for this visit (UTM params, landing page, referrer
 * domain). Kept in sessionStorage, contains no personal data, and is only
 * sent along with an inquiry the visitor chooses to submit.
 */
const KEY = "rcl:attribution";

export interface Attribution {
  utm: Partial<Record<"source" | "medium" | "campaign" | "term" | "content", string>>;
  landingPath?: string;
  referrer?: string;
}

export function captureAttribution() {
  try {
    if (window.sessionStorage.getItem(KEY)) return;
    const url = new URL(window.location.href);
    const utm: Attribution["utm"] = {};
    for (const k of ["source", "medium", "campaign", "term", "content"] as const) {
      const v = url.searchParams.get(`utm_${k}`);
      if (v) utm[k] = v.slice(0, 120);
    }
    let referrer: string | undefined;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      referrer = r && r.host !== url.host ? r.host : undefined;
    } catch {
      referrer = undefined;
    }
    const data: Attribution = { utm, landingPath: url.pathname.slice(0, 300), referrer };
    window.sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage blocked */
  }
}

export function readAttribution(): Attribution {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : { utm: {} };
  } catch {
    return { utm: {} };
  }
}
