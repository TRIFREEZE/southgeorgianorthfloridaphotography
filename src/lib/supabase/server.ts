import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/server-env";

export const PORTFOLIO_BUCKET = "portfolio";
export const UPLOADS_BUCKET = "portfolio-uploads";

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function isSupabaseConfigured() {
  const env = serverEnv();
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

export function isPublicSupabaseConfigured() {
  const env = serverEnv();
  return Boolean(env.supabaseUrl && (env.supabaseAnonKey || env.supabaseServiceKey));
}

/**
 * Privileged client (service role / secret key). Bypasses RLS — use only in
 * server code after authorization checks (inquiry inserts, admin actions).
 */
export function getServiceClient(): SupabaseClient {
  const env = serverEnv();
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceKey, noSession);
}

/**
 * Public read client (anon / publishable key). RLS limits it to published photos.
 * Falls back to the service key only for reads if no anon key is set.
 */
export function getPublicClient(): SupabaseClient {
  const env = serverEnv();
  const key = env.supabaseAnonKey ?? env.supabaseServiceKey;
  if (!env.supabaseUrl || !key) throw new Error("Supabase is not configured.");
  return createClient(env.supabaseUrl, key, noSession);
}

export function publicStorageUrl(path: string) {
  const { supabaseUrl } = serverEnv();
  return `${supabaseUrl}/storage/v1/object/public/${PORTFOLIO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
