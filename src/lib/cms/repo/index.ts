import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LocalRepo } from "./local";
import { SupabaseRepo } from "./supabase";
import type { CmsRepo } from "./types";

export type { CmsRepo } from "./types";

/**
 * The local file backend is a development/testing convenience. It can never be
 * active on Vercel, and a production `next start` must opt in explicitly.
 */
export function isLocalBackendAllowed() {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_LOCAL_BACKEND === "1" || process.env.ALLOW_MEMORY_STORE === "1";
}

export function getRepo(): CmsRepo | null {
  if (isSupabaseConfigured()) return new SupabaseRepo();
  if (isLocalBackendAllowed()) return new LocalRepo();
  return null;
}

export function requireRepo(): CmsRepo {
  const repo = getRepo();
  if (!repo) throw new Error("The CMS needs Supabase: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return repo;
}
