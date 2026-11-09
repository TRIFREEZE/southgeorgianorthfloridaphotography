import "server-only";
import { serverEnv } from "@/lib/server-env";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
  bcc?: string | string[];
  /** Hosted files Resend fetches and attaches (e.g. a received email's attachments). */
  attachments?: { filename: string; path: string; content_type?: string; content_id?: string }[];
  headers?: Record<string, string>;
  /** Resend ignores a repeat send with the same key for 24 hours (safe webhook retries). */
  idempotencyKey?: string;
}

export type EmailResult = { status: "sent"; id?: string } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

/**
 * Transactional email via Resend's HTTP API (no SDK needed). Without
 * RESEND_API_KEY + EMAIL_FROM it reports "skipped" (the inquiry is still saved
 * and visible in /admin).
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const { resendApiKey, emailFrom } = serverEnv();
  if (!resendApiKey || !emailFrom) return { status: "skipped", reason: "email provider not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendApiKey}`, "content-type": "application/json", ...(msg.idempotencyKey ? { "idempotency-key": msg.idempotencyKey.slice(0, 256) } : {}) },
      body: JSON.stringify({
        from: emailFrom,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
        bcc: msg.bcc,
        attachments: msg.attachments?.length ? msg.attachments : undefined,
        headers: msg.headers,
      }),
      signal: AbortSignal.timeout(msg.attachments?.length ? 20000 : 8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { status: "failed", reason: `resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { status: "sent", id: data.id };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown error" };
  }
}
