import type { Metadata } from "next";
import { ContactLink } from "@/components/layout/ContactLink";
import { ButtonLink, Container } from "@/components/ui/primitives";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Client galleries",
  robots: { index: false, follow: false },
};

/**
 * Phase 1: private galleries are delivered through a dedicated gallery provider
 * (secure links/passwords enforced server-side by that provider). This page does
 * not pretend to be a secure gallery itself.
 */
export default function ClientGalleryPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-2xl">
        <p className="eyebrow">Client galleries</p>
        <h1 className="mt-4 text-display-md">Looking for your photos?</h1>
        <p className="mt-6 text-lede text-ink-soft">
          Your private gallery link arrives by email when your photos are ready. It&apos;s the safest way in, and it&apos;s unique to you.
        </p>
        <ul className="prose-rcl mt-8">
          <li>Search your inbox (and spam) for an email from us with &ldquo;gallery&rdquo; in the subject.</li>
          <li>Links are private. Please don&apos;t post them publicly.</li>
          <li>Lost it or the link expired? Ask and we&apos;ll resend it.</li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/contact">Request my gallery link</ButtonLink>
          {publicEnv.contactEmail && (
            <ContactLink kind="email" value={publicEnv.contactEmail} label={`Email ${publicEnv.contactEmail}`} className="inline-flex min-h-12 items-center px-2 font-semibold underline" />
          )}
        </div>
      </Container>
    </section>
  );
}
