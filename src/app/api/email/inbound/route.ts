import { NextResponse, type NextRequest } from "next/server";
import { forwardReceived, verifyWebhook } from "@/lib/inbound";
import { serverEnv } from "@/lib/server-env";

const MAX_BODY_BYTES = 256_000;

/**
 * Resend "email.received" webhook. Verifies the signature, then forwards the message
 * to the owner. Answers 5xx only when a retry could help (Resend retries automatically).
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv().resendWebhookSecret;
  if (!secret) {
    console.error("[inbound] RESEND_WEBHOOK_SECRET is not set; refusing webhook");
    return NextResponse.json({ ok: false, error: "Receiving isn't configured." }, { status: 503 });
  }
  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });
  const ok = verifyWebhook(secret, { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") }, body);
  if (!ok) return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Other event types (delivered, bounced…) are acknowledged and ignored.
  if (event.type !== "email.received" || !event.data?.email_id) return NextResponse.json({ ok: true, ignored: true });

  try {
    const out = await forwardReceived(event.data.email_id);
    if (out.status !== "forwarded") console.warn(`[inbound] ${event.data.email_id} not forwarded: ${out.reason}`);
    return NextResponse.json({ ok: true, status: out.status });
  } catch (err) {
    console.error("[inbound] forward failed; Resend will retry", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
