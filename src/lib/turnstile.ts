import "server-only";
import { serverEnv } from "@/lib/server-env";

/** Returns true when Turnstile isn't configured (optional layer) or the token verifies. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<{ ok: boolean; required: boolean }> {
  const secret = serverEnv().turnstileSecret;
  if (!secret) return { ok: true, required: false };
  if (!token) return { ok: false, required: true };
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: Boolean(data.success), required: true };
  } catch (err) {
    console.error("[turnstile] verification error", err instanceof Error ? err.message : err);
    return { ok: false, required: true };
  }
}
