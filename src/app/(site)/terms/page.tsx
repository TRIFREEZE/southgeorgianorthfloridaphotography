import type { Metadata } from "next";
import { pricing } from "@/content/pricing";
import { site } from "@/content/site";
import { LegalPage } from "@/components/ui/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Terms of Use", description: `Terms for using the ${site.shortName} website.`, path: "/terms" });

/* OWNER: your session contract governs bookings. Have both reviewed by a local professional before taking payments. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="November 7, 2026">
      <p>By using this website you agree to these terms. They cover the website only. Photography sessions are governed by a separate written agreement.</p>
      <h2>Inquiries aren&apos;t bookings</h2>
      <p>
        Submitting a form, building a session story or using the estimate tool does not reserve a date or create a contract. A session
        is booked only once we&apos;ve confirmed availability with you personally and agreed on scope and terms in writing
        {pricing.deposit.enabled ? ", including any retainer" : ""}.
      </p>
      <h2>Prices and estimates</h2>
      <p>
        Prices shown are our current published rates for standard portrait sessions and may change. Estimates are based on those
        rates; travel, custom work and applicable taxes are confirmed before you book. Weddings, events and business photography are
        always custom quoted.
      </p>
      <h2>Photographs on this site</h2>
      <p>
        All photographs are protected by copyright and shared with permission. Please don&apos;t copy, download or reuse them without
        written permission. Clients receive the usage rights described in their agreement (portrait packages include a personal-use
        print release).
      </p>
      <h2>Acceptable use</h2>
      <p>Please don&apos;t misuse the site, submit false information, attempt to break its security or send automated submissions.</p>
      <h2>No warranty</h2>
      <p>We work hard to keep this website accurate and available, but it&apos;s provided as is, and we may update it at any time.</p>
      <h2>Contact</h2>
      <p>
        Questions about these terms? <a href="/contact">Get in touch</a>.
      </p>
    </LegalPage>
  );
}
