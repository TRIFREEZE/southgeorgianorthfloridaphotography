import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalPage } from "@/components/ui/LegalPage";
import { publicEnv } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Privacy Policy", description: `How ${site.shortName} collects, uses and protects your information.`, path: "/privacy" });

/* OWNER: have this reviewed for your situation before launch. It describes exactly what this website does today. */
export default function PrivacyPage() {
  const contact = publicEnv.contactEmail ? (
    <a href={`mailto:${publicEnv.contactEmail}`}>{publicEnv.contactEmail}</a>
  ) : (
    <a href="/contact">our contact form</a>
  );
  return (
    <LegalPage title="Privacy policy" updated="November 7, 2026">
      <p>
        {site.name} (&ldquo;we&rdquo;) respects your privacy. This policy explains what this website collects, why, and the choices you
        have. We don&apos;t sell your personal information, and we don&apos;t use it for advertising.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Inquiries you send us:</strong> your name, email, optional phone number, and what you tell us about your session
          (type of session, package, dates, general location, notes, and any inspiration photos you saved).
        </li>
        <li>
          <strong>Text-message consent:</strong> only if you tick the separate text option. You can reply STOP at any time.
        </li>
        <li>
          <strong>Basic visit context with an inquiry:</strong> the page you first landed on, the referring website and campaign tags in
          the link you used (for example utm_source), so we know how people find us.
        </li>
        <li>
          <strong>Security data:</strong> a one-way, salted fingerprint of your IP address (not the address itself) and your browser
          type, used to stop spam and abuse.
        </li>
        <li>
          <strong>Anonymous analytics:</strong> page views and simple events such as &ldquo;started booking&rdquo; via Vercel Web Analytics,
          which doesn&apos;t use cookies. We never send what you type into forms to analytics.
        </li>
      </ul>
      <h2>Stored on your device</h2>
      <p>
        Some conveniences are saved only in your own browser and never sent to us unless you submit a form: photos you
        &ldquo;save as inspiration,&rdquo; an in-progress booking draft (without your contact details), and whether you&apos;ve hidden or
        muted Flick, the site helper. Clearing your browser storage removes them.
      </p>
      <h2>How we use it</h2>
      <ul>
        <li>To reply to you, plan and quote your session, and send you a confirmation email.</li>
        <li>To keep records of inquiries and bookings.</li>
        <li>To protect the website from spam and misuse.</li>
        <li>To understand, in aggregate, which pages and channels are helpful.</li>
      </ul>
      <h2>Who helps us run this site</h2>
      <p>
        We use trusted service providers that process data on our behalf: Vercel (hosting and analytics), Supabase (secure
        database), Resend (email delivery) and, if enabled, Cloudflare Turnstile (bot protection). They may only use your data to
        provide their service to us.
      </p>
      <h2>How long we keep it</h2>
      <p>
        We keep inquiries for as long as we need them to respond, provide our services and keep reasonable business records. You can
        ask us to delete your information at any time.
      </p>
      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete the personal information we hold about you, or to stop receiving messages from us.
        Contact {contact}.
      </p>
      <h2>Children</h2>
      <p>This website isn&apos;t directed to children, and inquiries should be sent by an adult.</p>
      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>
    </LegalPage>
  );
}
