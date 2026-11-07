"use client";

import { track as vercelTrack } from "@vercel/analytics";

export type FunnelEvent =
  | "view_service"
  | "view_pricing"
  | "start_booking"
  | "select_category"
  | "select_package"
  | "submit_inquiry"
  | "confirmation_view"
  | "click_phone"
  | "click_email"
  | "portfolio_open"
  | "story_complete"
  | "flick_open";

type Props = Record<string, string | number | boolean | null>;

/**
 * Funnel analytics via Vercel Web Analytics (cookieless). Never pass names,
 * emails, phone numbers, notes or anything a visitor typed.
 */
export function track(event: FunnelEvent, props?: Props) {
  try {
    vercelTrack(event, props);
  } catch {
    /* analytics must never break the page */
  }
}
