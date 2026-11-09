import "server-only";
import { serverEnv } from "@/lib/server-env";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
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
      headers: { authorization: `Bearer ${resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
      }),
      signal: AbortSignal.timeout(8000),
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
