import Link from "next/link";
import { Suspense } from "react";
import { EmailPreview } from "@/components/admin/EmailPreview";
import { requireAdmin } from "@/lib/admin-auth";
import { sampleEmails } from "@/lib/inquiry/email-samples";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

export const metadata = { title: "Emails" };

export default function EmailsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const env = serverEnv();
  const { client, owner } = await sampleEmails();
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-display-sm">Emails</h1>
        <p className="mt-2 text-muted">
          What clients get the moment they send an inquiry, and the heads-up you get. Shown with a made-up sample client. Every word is yours to change in{" "}
          <Link href="/admin/content" className="underline">
            Pricing &amp; text
          </Link>{" "}
          under <strong>Confirmation email</strong>, <strong>New-inquiry email</strong> and <strong>Email details list</strong>. The steps come from “How it works” on the site, so they always match.
        </p>
        {!env.resendApiKey || !env.emailFrom ? (
          <p className="mt-4 rounded-xl border border-[#a3392b]/30 bg-[#a3392b]/[0.06] px-4 py-3 text-sm text-[#7d2a20]">
            Email isn&apos;t switched on yet, so nothing is being sent. Add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel (DEPLOYMENT.md, step 3).
          </p>
        ) : null}
      </header>
      <EmailPreview
        emails={[
          { id: "client", label: "Client confirmation", subject: client.subject, html: client.html },
          { id: "owner", label: "Your new-inquiry email", subject: owner.subject, html: owner.html },
        ]}
      />
      <Receiving />
    </div>
  );
}

/** Status and setup for receiving mail at your domain (Resend "Receiving"). */
function Receiving() {
  const env = serverEnv();
  const forwardTo = env.inboundForwardTo ?? env.ownerNotificationEmail;
  const webhook = `${publicEnv.siteUrl}/api/email/inbound`;
  const checks = [
    { ok: Boolean(env.resendApiKey && env.emailFrom), label: "Sending is set up (RESEND_API_KEY and EMAIL_FROM)" },
    { ok: Boolean(env.resendWebhookSecret), label: "Webhook signing secret added (RESEND_WEBHOOK_SECRET)" },
    { ok: Boolean(forwardTo), label: forwardTo ? `Received mail is forwarded to ${forwardTo}` : "An inbox to forward to (INBOUND_FORWARD_TO or OWNER_NOTIFICATION_EMAIL)" },
  ];
  const ready = checks.every((c) => c.ok);
  return (
    <section aria-labelledby="receiving-title" className="max-w-3xl rounded-2xl border border-line bg-parchment p-6" data-testid="receiving">
      <h2 id="receiving-title" className="text-[1.6rem]">
        Receiving email at your domain
      </h2>
      <p className="mt-2 text-muted">
        Mail sent to an address at your domain (like hello@…) arrives through Resend and is forwarded to your inbox. Hitting <strong>Reply</strong> answers the sender directly. Resend also keeps a copy of every received email under Emails → Receiving.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            <span aria-hidden className={c.ok ? "text-moss-deep" : "text-[#a3392b]"}>
              {c.ok ? "✓" : "✗"}
            </span>
            <span>
              <span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
      <p className={`mt-4 text-sm font-semibold ${ready ? "text-moss-deep" : "text-[#7d2a20]"}`}>{ready ? "Receiving is switched on." : "Receiving is off until the items above are done."}</p>
      <details className="mt-4 text-sm" open={!ready}>
        <summary className="cursor-pointer font-semibold underline underline-offset-4">How to set it up (about 10 minutes)</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            In Resend → <strong>Domains</strong>, open your domain and switch on <strong>Receiving</strong>. Add the <strong>MX</strong> record it shows at your DNS provider. If you already get email at this domain (Gmail, Outlook…), use a subdomain instead, like <code>mail.yourdomain.com</code>, so your current email keeps working.
          </li>
          <li>
            In Resend → <strong>Webhooks</strong>, add a webhook with the URL <code className="break-all rounded bg-gallery px-1">{webhook}</code> and the event <strong>email.received</strong>.
          </li>
          <li>
            Copy that webhook&apos;s <strong>signing secret</strong> (starts with <code>whsec_</code>) into Vercel as <code>RESEND_WEBHOOK_SECRET</code>. Optionally set <code>INBOUND_FORWARD_TO</code> to the inbox that should get the mail (otherwise it goes to <code>OWNER_NOTIFICATION_EMAIL</code>; don&apos;t use an address at the receiving domain itself). Redeploy.
          </li>
          <li>Send a test email to any address at the receiving domain. It should land in your inbox within a minute.</li>
        </ol>
      </details>
    </section>
  );
}
