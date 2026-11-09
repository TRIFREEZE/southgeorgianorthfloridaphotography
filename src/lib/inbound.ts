import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { esc } from "@/lib/email-design";
import { C } from "@/lib/email-design";
import { sendEmail, type EmailResult } from "@/lib/email";
import { serverEnv } from "@/lib/server-env";

/**
 * Receiving email at your own domain through Resend ("Receiving"):
 * Resend accepts the mail, calls our webhook with its id, we fetch the message and
 * forward it to the owner's inbox with Reply set to the original sender.
 */

const TOLERANCE_S = 5 * 60;

/**
 * Checks a Resend (Svix) webhook signature: HMAC-SHA256 over "id.timestamp.body" with the
 * base64 secret after "whsec_", compared against every "v1,<sig>" in the header, and the
 * timestamp must be within five minutes (blocks replays).
 */
export function verifyWebhook(secret: string, h: { id: string | null; timestamp: string | null; signature: string | null }, body: string, now = Date.now()): boolean {
  if (!h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_S) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;
  const expected = createHmac("sha256", key).update(`${h.id}.${h.timestamp}.${body}`).digest();
  return h.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type Received = {
  id: string;
  from: string;
  to: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  reply_to?: string[] | string | null;
  authentication?: unknown;
};

type ReceivedAttachment = { filename: string | null; content_type: string | null; content_id: string | null; content_disposition: string | null; download_url: string; size?: number };

async function resendGet<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`https://api.resend.com${path}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`resend ${res.status} on ${path}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** "Jane Smith <jane@x.com>" → "jane@x.com" */
export const addressOf = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase();
const domainOf = (s: string) => addressOf(s).split("@")[1] ?? "";

/** True when any sender check (SPF / DKIM / DMARC) explicitly failed. */
export function failedAuth(auth: unknown): boolean {
  if (!auth || typeof auth !== "object") return false;
  return /"(fail|softfail|permerror)"|:\s*"?fail/i.test(JSON.stringify(auth));
}

export type InboundOutcome = { status: "forwarded" | "skipped" | "failed"; reason?: string; result?: EmailResult };

/** Fetches a received email and forwards it to the owner. Throws only for retryable problems. */
export async function forwardReceived(emailId: string): Promise<InboundOutcome> {
  const env = serverEnv();
  if (!env.resendApiKey || !env.emailFrom) return { status: "skipped", reason: "sending isn't configured (RESEND_API_KEY / EMAIL_FROM)" };
  const to = env.inboundForwardTo ?? env.ownerNotificationEmail;
  if (!to) return { status: "skipped", reason: "no INBOUND_FORWARD_TO or OWNER_NOTIFICATION_EMAIL to forward to" };

  const mail = await resendGet<Received>(`/emails/receiving/${encodeURIComponent(emailId)}`, env.resendApiKey);
  const sender = addressOf(mail.from);

  // Never loop: our own messages, or forwarding into the receiving domain itself.
  if (sender === addressOf(env.emailFrom)) return { status: "skipped", reason: "message came from our own sending address" };
  if (mail.to.some((x) => domainOf(x) === domainOf(to))) return { status: "skipped", reason: `INBOUND_FORWARD_TO (${to}) is on the receiving domain; that would loop` };

  const atts = await resendGet<{ data: ReceivedAttachment[] }>(`/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`, env.resendApiKey).catch(() => ({ data: [] }));
  const replyTo = (Array.isArray(mail.reply_to) ? mail.reply_to : mail.reply_to ? [mail.reply_to] : []).filter(Boolean);
  const warn = failedAuth(mail.authentication);
  const toLine = mail.to.join(", ");

  const banner = `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${C.inkSoft};background:${C.parchment};border:1px solid ${C.line};border-radius:12px;padding:12px 16px;margin:0 0 18px;">
<strong style="color:${C.clayDeep};">Received at ${esc(toLine)}</strong><br>From ${esc(mail.from)}. Hitting Reply answers them directly.${
    warn ? `<br><strong style="color:#a3392b;">Careful: this message failed the sender's security checks. Don't click links or open attachments you weren't expecting.</strong>` : ""
  }</div>`;
  const original = mail.html ?? (mail.text ? `<pre style="white-space:pre-wrap;font-family:inherit;">${esc(mail.text)}</pre>` : "<p>(No message text.)</p>");

  const result = await sendEmail({
    to,
    subject: mail.subject?.trim() || "(no subject)",
    replyTo: replyTo.length ? replyTo : mail.from,
    html: `${banner}${original}`,
    text: `Received at ${toLine} from ${mail.from}. Reply answers them directly.${warn ? "\nCareful: this message failed the sender's security checks." : ""}\n\n${mail.text ?? ""}`,
    attachments: atts.data
      .filter((a) => a.download_url)
      .map((a) => ({ filename: a.filename || "attachment", path: a.download_url, content_type: a.content_type ?? undefined, content_id: a.content_id ? a.content_id.replace(/^<|>$/g, "") : undefined })),
    headers: { "X-Southstill-Forwarded": "1" },
    // A webhook retry for the same message never sends a second copy.
    idempotencyKey: `inbound-${emailId}`,
  });
  if (result.status === "failed") throw new Error(result.reason);
  return { status: result.status === "sent" ? "forwarded" : "skipped", reason: result.status === "skipped" ? result.reason : undefined, result };
}
