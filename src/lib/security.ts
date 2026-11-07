import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

/** Privacy-preserving IP fingerprint for rate limiting (raw IPs are never stored). */
export function hashIp(ip: string) {
  const salt = serverEnv().ipHashSalt ?? serverEnv().adminSessionSecret ?? "rcl-dev-salt";
  return sha256(`${salt}:${ip}`).slice(0, 40);
}

export function clientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for") ?? headers.get("x-vercel-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || headers.get("x-real-ip") || "0.0.0.0";
}

export function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Same-origin check for state-changing requests from browsers. */
export function isSameOrigin(headers: Headers, expectedHost: string | null) {
  const origin = headers.get("origin");
  if (!origin) return true; // non-browser or same-origin navigations without Origin
  try {
    const o = new URL(origin);
    return !expectedHost || o.host === expectedHost;
  } catch {
    return false;
  }
}
