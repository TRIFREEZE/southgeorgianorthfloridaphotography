import type { Metadata } from "next";
import { site } from "@/content/site";
import { QuickInquiry } from "@/components/booking/QuickInquiry";
import { ContactLink } from "@/components/layout/ContactLink";
import { Container, PageHero } from "@/components/ui/primitives";
import { publicEnv, socialLinks } from "@/lib/env";
import { getSiteData, getT } from "@/lib/cms/data";
import { bookingOptions } from "@/lib/cms/sessions";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Get in touch with ${site.shortName}, photography across South Georgia and North Florida.`,
  path: "/contact",
});

export default async function ContactPage() {
  const t = await getT();
  return (
    <>
      <PageHero eyebrow={t("contact.eyebrow")} title={t("contact.title")} lede={t("contact.lede")} />
      <Container className="grid gap-12 pb-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuickInquiry kind="contact" idPrefix="contact" submitLabel={t("contact.submit")} options={bookingOptions((await getSiteData()).content)} />
        </div>
        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          {(publicEnv.contactEmail || publicEnv.contactPhone) && (
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">{t("contact.direct")}</h2>
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
            <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">{t("contact.whereTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("contact.where")}</p>
          </div>
          {socialLinks.length > 0 && (
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">{t("contact.follow")}</h2>
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
            <h2 className="font-sans text-sm font-bold uppercase tracking-[0.12em] text-clay-deep">{t("contact.readyTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("contact.ready")}</p>
            <a className="mt-2 inline-block font-semibold text-clay-deep underline" href="/book">
              {t("contact.readyLink")}
            </a>
          </div>
        </aside>
      </Container>
    </>
  );
}
