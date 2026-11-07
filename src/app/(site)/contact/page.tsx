import type { Metadata } from "next";
import { site } from "@/content/site";
import { QuickInquiry } from "@/components/booking/QuickInquiry";
import { ContactLink } from "@/components/layout/ContactLink";
import { Container, PageHero } from "@/components/ui/primitives";
import { publicEnv, socialLinks } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Get in touch with ${site.shortName}, photography across South Georgia and North Florida.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Say hello." lede="Questions, ideas, a date you're holding? Send a note and you'll hear back from a real person." />
      <Container className="grid gap-12 pb-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuickInquiry kind="contact" idPrefix="contact" submitLabel="Send message" />
        </div>
        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          {(publicEnv.contactEmail || publicEnv.contactPhone) && (
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">Direct</h2>
              <ul className="mt-3 space-y-2 text-lede">
                {publicEnv.contactEmail && (
                  <li>
                    <ContactLink kind="email" value={publicEnv.contactEmail} className="underline" />
                  </li>
                )}
                {publicEnv.contactPhone && (
                  <li>
                    <ContactLink kind="phone" value={publicEnv.contactPhone} className="underline" />
                  </li>
                )}
              </ul>
            </div>
          )}
          <div>
            <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">Where we work</h2>
            <p className="mt-3 text-ink-soft">
              {site.region}
              {publicEnv.baseCity ? `, based near ${publicEnv.baseCity}` : ""}. Sessions happen on location: homes, farms, parks,
              venues and businesses. There&apos;s no public studio.
            </p>
          </div>
          {socialLinks.length > 0 && (
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">Follow along</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {socialLinks.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} className="underline" rel="me noopener" target="_blank">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">Ready to plan?</h2>
            <p className="mt-3 text-ink-soft">
              The <a className="underline" href="/book">session finder</a> gives you a live estimate first.
            </p>
          </div>
        </aside>
      </Container>
    </>
  );
}
