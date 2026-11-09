import Link from "next/link";
import { Suspense } from "react";
import { EmailPreview } from "@/components/admin/EmailPreview";
import { requireAdmin } from "@/lib/admin-auth";
import { sampleEmails } from "@/lib/inquiry/email-samples";
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
          What clients get the moment they send an inquiry, and the heads-up you get. Shown with a made-up sample client. The wording is yours to change in{" "}
          <Link href="/admin/content" className="underline">
            Pricing &amp; text → Confirmation email
          </Link>
          ; the steps come from “How it works” on the site, so they always match.
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
    </div>
  );
}
