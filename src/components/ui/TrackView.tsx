"use client";

import { useEffect } from "react";
import { track, type FunnelEvent } from "@/lib/analytics";

export function TrackView({ event, props }: { event: FunnelEvent; props?: Record<string, string> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(event, JSON.parse(key));
  }, [event, key]);
  return null;
}
