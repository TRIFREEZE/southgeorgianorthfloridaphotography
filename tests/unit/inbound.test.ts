import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SECRET = `whsec_${Buffer.from("test-signing-key-0123456789").toString("base64")}`;
const sign = (id: string, ts: string, body: string, secret = SECRET) =>
  `v1,${createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("Resend webhook signature", () => {
  it("accepts a correctly signed, fresh request and rejects anything else", async () => {
    const { verifyWebhook } = await import("@/lib/inbound");
    const body = JSON.stringify({ type: "email.received", data: { email_id: "abc" } });
    const now = Date.now();
    const ts = String(Math.floor(now / 1000));
    const good = { id: "msg_1", timestamp: ts, signature: `v1,bm9wZQ== ${sign("msg_1", ts, body)}` };
    expect(verifyWebhook(SECRET, good, body, now)).toBe(true);
    expect(verifyWebhook(SECRET, good, body.replace("abc", "xyz"), now)).toBe(false); // tampered body
    expect(verifyWebhook(SECRET, { ...good, id: "msg_2" }, body, now)).toBe(false); // wrong id
    expect(verifyWebhook(SECRET, good, body, now + 10 * 60_000)).toBe(false); // replayed later
    expect(verifyWebhook(`whsec_${Buffer.from("other").toString("base64")}`, good, body, now)).toBe(false);
    expect(verifyWebhook(SECRET, { id: null, timestamp: ts, signature: good.signature }, body, now)).toBe(false);
  });

  it("spots failed sender checks and reads addresses", async () => {
    const { failedAuth, addressOf } = await import("@/lib/inbound");
    expect(failedAuth({ spf: "pass", dkim: "pass", dmarc: "pass" })).toBe(false);
    expect(failedAuth({ spf: { result: "fail" } })).toBe(true);
    expect(addressOf("Jane Smith <Jane@Example.com>")).toBe("jane@example.com");
  });
});

describe("forwarding a received email", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("forwards to the owner with Reply going to the sender, attachments and a retry-safe key", async () => {
    Object.assign(process.env, { RESEND_API_KEY: "re_test", EMAIL_FROM: "Southstill <hello@southstill.example>", OWNER_NOTIFICATION_EMAIL: "owner@gmail.example", INBOUND_FORWARD_TO: "" });
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/attachments?limit=100"))
        return new Response(JSON.stringify({ data: [{ filename: "barn.jpg", content_type: "image/jpeg", content_id: "<img1>", content_disposition: "inline", download_url: "https://inbound-cdn.resend.com/a/barn.jpg?sig=1" }] }));
      if (url.includes("/emails/receiving/"))
        return new Response(JSON.stringify({ id: "em_1", from: "Jane <jane@client.example>", to: ["hello@mail.southstill.example"], subject: "Fall session?", html: "<p>Hi there</p>", text: "Hi there", reply_to: [], authentication: { spf: "pass" } }));
      return new Response(JSON.stringify({ id: "sent_1" }));
    });
    const { forwardReceived } = await import("@/lib/inbound");
    const out = await forwardReceived("em_1");
    expect(out.status).toBe("forwarded");
    const send = calls.find((c) => c.url === "https://api.resend.com/emails")!;
    const payload = JSON.parse(String(send.init!.body));
    expect(payload.to).toEqual(["owner@gmail.example"]);
    expect(payload.reply_to).toBe("Jane <jane@client.example>");
    expect(payload.subject).toBe("Fall session?");
    expect(payload.html).toContain("Received at hello@mail.southstill.example");
    expect(payload.html).toContain("<p>Hi there</p>");
    expect(payload.attachments[0]).toMatchObject({ filename: "barn.jpg", path: "https://inbound-cdn.resend.com/a/barn.jpg?sig=1", content_id: "img1" });
    expect((send.init!.headers as Record<string, string>)["idempotency-key"]).toBe("inbound-em_1");
  });

  it("refuses to forward into the receiving domain itself (no loops)", async () => {
    Object.assign(process.env, { RESEND_API_KEY: "re_test", EMAIL_FROM: "Southstill <hello@southstill.example>", INBOUND_FORWARD_TO: "me@mail.southstill.example" });
    vi.stubGlobal("fetch", async (url: string) =>
      new Response(JSON.stringify(url.includes("attachments") ? { data: [] } : { id: "em_2", from: "x@y.example", to: ["hello@mail.southstill.example"], subject: "s", html: null, text: "t" })),
    );
    const { forwardReceived } = await import("@/lib/inbound");
    expect((await forwardReceived("em_2")).status).toBe("skipped");
  });
});
