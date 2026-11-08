import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isLocalBackendAllowed } from "@/lib/cms/repo";
import { serverEnv } from "@/lib/server-env";
import { hmac, safeEqual, sha256 } from "@/lib/security";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Owner login: email + password checked by Supabase Auth (create the user in
 * Supabase → Authentication → Users), then the email must be in ADMIN_EMAILS.
 * We then issue our own short-lived, HMAC-signed, HttpOnly session cookie.
 * Passwords are never stored or logged by this app.
 *
 * Local development / automated tests only (never on Vercel): when Supabase isn't
 * configured, ADMIN_DEV_PASSWORD can be used instead of Supabase Auth.
 */
export const ADMIN_COOKIE = "rcl_admin";
const SESSION_HOURS = 12;

export type AdminConfig = { ok: true; mode: "supabase" | "local" } | { ok: false; problem: string };

/** Local password login is possible only off-Vercel with no Supabase configured. */
function localLoginEnabled() {
  return !isSupabaseConfigured() && isLocalBackendAllowed() && Boolean(process.env.ADMIN_DEV_PASSWORD);
}

export function adminConfig(): AdminConfig {
  const env = serverEnv();
  if (localLoginEnabled()) {
    if (!env.adminSessionSecret || env.adminSessionSecret.length < 32) return { ok: false, problem: "ADMIN_SESSION_SECRET must be at least 32 characters." };
    if (env.adminEmails.length === 0) return { ok: false, problem: "ADMIN_EMAILS is empty." };
    return { ok: true, mode: "local" };
  }
  if (!env.supabaseUrl || !(env.supabaseAnonKey || env.supabaseServiceKey)) return { ok: false, problem: "Supabase isn't configured." };
  if (!env.supabaseServiceKey) return { ok: false, problem: "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing." };
  if (!env.adminSessionSecret || env.adminSessionSecret.length < 32) return { ok: false, problem: "ADMIN_SESSION_SECRET must be at least 32 characters." };
  if (env.adminEmails.length === 0) return { ok: false, problem: "ADMIN_EMAILS is empty." };
  return { ok: true, mode: "supabase" };
}

function sign(email: string, exp: number) {
  const secret = serverEnv().adminSessionSecret!;
  const payload = `${Buffer.from(email).toString("base64url")}.${exp}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function verifySessionToken(token: string | undefined): { email: string } | null {
  const env = serverEnv();
  if (!token || !env.adminSessionSecret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts;
  const expected = hmac(env.adminSessionSecret, `${emailB64}.${expStr}`);
  if (!safeEqual(sig, expected)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const email = Buffer.from(emailB64, "base64url").toString();
  if (!env.adminEmails.includes(email.toLowerCase())) return null;
  return { email };
}

export async function getAdmin() {
  // Read the cookie first so admin pages are always rendered per request, never at build time.
  await connection();
  const jar = await cookies();
  if (!adminConfig().ok) return null;
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function checkPassword(email: string, password: string): Promise<boolean> {
  const env = serverEnv();
  if (localLoginEnabled()) return safeEqual(sha256(password), sha256(process.env.ADMIN_DEV_PASSWORD!));
  const key = env.supabaseAnonKey ?? env.supabaseServiceKey;
  if (!env.supabaseUrl || !key) return false;
  const client = createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return false;
  await client.auth.signOut().catch(() => {});
  return (data.user.email ?? "").toLowerCase() === email.toLowerCase();
}

export async function startSession(email: string) {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign(email.toLowerCase(), exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
