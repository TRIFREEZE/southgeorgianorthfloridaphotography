import "server-only";
import { serverEnv } from "@/lib/server-env";
import { escapeHtml } from "@/lib/security";

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

export function emailLayout(title: string, rows: string) {
  return `<!doctype html><html><body style="margin:0;background:#F6F2EA;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#252723">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCF7;border:1px solid #E3D9CA;border-radius:14px">
<tr><td style="padding:28px 28px 8px"><p style="margin:0;font-family:Georgia,serif;font-size:20px">Red Clay <span style="color:#A46B55;font-style:italic">&amp;</span> Light</p>
<h1 style="margin:18px 0 0;font-family:Georgia,serif;font-weight:400;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6">${rows}</td></tr></table>
</td></tr></table></body></html>`;
}

export const p = (s: string) => `<p style="margin:12px 0">${escapeHtml(s)}</p>`;
export const kv = (k: string, v: string | undefined | null) =>
  v ? `<p style="margin:6px 0"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>` : "";
