"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { emitFlick } from "@/components/flick/bus";
import { readAttribution } from "./attribution";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; fields: Record<string, string> };

/**
 * Shared submit logic: prevents duplicate submissions, maps server field errors
 * back to inputs, and only navigates to the thank-you page after the server
 * confirms the inquiry was stored.
 */
export function useInquirySubmit() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const inFlight = useRef(false);

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setState({ status: "submitting" });
      const attribution = readAttribution();
      try {
        const res = await fetch("/api/inquiry", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ ...payload, utm: attribution.utm, landingPath: attribution.landingPath, referrer: attribution.referrer }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          ref?: string;
          message?: string;
          fields?: Record<string, string>;
        };
        if (res.ok && data.ok) {
          track("submit_inquiry", { kind: String(payload.kind ?? "quick"), category: String(payload.category ?? "other") });
          emitFlick({ type: "booking-complete" });
          router.push(`/book/thanks${data.ref ? `?ref=${encodeURIComponent(data.ref)}` : ""}`);
          return true;
        }
        emitFlick({ type: "form-error" });
        setState({
          status: "error",
          message: data.message ?? "Something went wrong sending your message. Please try again.",
          fields: data.fields ?? {},
        });
        inFlight.current = false;
        return false;
      } catch {
        emitFlick({ type: "form-error" });
        setState({
          status: "error",
          message: "We couldn't reach the server. Check your connection and try again. Nothing was sent yet.",
          fields: {},
        });
        inFlight.current = false;
        return false;
      }
    },
    [router],
  );

  return { state, submit, setState };
}
