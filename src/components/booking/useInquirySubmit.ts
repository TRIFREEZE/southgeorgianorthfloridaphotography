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
  /** Bumps on every failed send, so the error box can scroll into view each time. */
  const [tick, setTick] = useState(0);

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
        const fields = data.fields ?? {};
        setState({
          status: "error",
          // With field problems, the list itself explains them; the generic line would only repeat it.
          message: Object.keys(fields).length && /highlighted fields/i.test(data.message ?? "") ? "" : (data.message ?? "Something went wrong sending your message. Please try again."),
          fields,
        });
        setTick((t) => t + 1);
        inFlight.current = false;
        return false;
      } catch {
        emitFlick({ type: "form-error" });
        setState({
          status: "error",
          message: "We couldn't reach the server. Check your connection and try again. Nothing was sent yet.",
          fields: {},
        });
        setTick((t) => t + 1);
        inFlight.current = false;
        return false;
      }
    },
    [router],
  );

  /** Forget a server error once the visitor changes that field. */
  const clearField = useCallback((key: string) => {
    setState((s) => {
      if (s.status !== "error" || !s.fields[key]) return s;
      const fields = { ...s.fields };
      delete fields[key];
      return { ...s, fields };
    });
  }, []);

  return { state, submit, setState, tick, clearField };
}
