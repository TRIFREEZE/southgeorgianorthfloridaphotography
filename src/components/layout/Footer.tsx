import Link from "next/link";
import { site } from "@/content/site";
import { getSiteData, getT } from "@/lib/cms/data";
import { servicePages } from "@/lib/cms/sessions";
import { publicEnv, socialLinks } from "@/lib/env";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { Container } from "@/components/ui/primitives";
import { ContactLink } from "./ContactLink";
import { FlickFooterControl } from "./FlickFooterControl";
import { Year } from "./Year";

export async function Footer() {
  const t = await getT();
  const services = servicePages((await getSiteData()).content);
  const towns = site.serviceArea.towns.map((t) => `${t.name}, ${t.state}`);
  return (
    <footer className="on-dark relative mt-24 overflow-hidden bg-ink text-sand">
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 text-gallery">
              <LogoMark className="h-11 w-11" />
              <Wordmark className="h-9" />
            </Link>
            <p className="mt-5 font-display text-xl text-gallery/90 italic">{t("site.primaryLine")}</p>
            <p className="mt-4 text-sm leading-relaxed text-sand/80">{t("site.footer.blurb")}</p>
          </div>

          <div>
            <h2 className="eyebrow mb-4">{t("site.footer.sessions")}</h2>
            <ul className="space-y-2.5 text-sm">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link className="hover:text-gallery hover:underline" href={`/services/${s.slug}`}>
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="hover:text-gallery hover:underline" href="/pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link className="hover:text-gallery hover:underline" href="/client-gallery">
                  Client galleries
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow mb-4">{t("site.footer.where")}</h2>
            <p className="text-sm leading-relaxed text-sand/85">
              {site.serviceArea.regionsServed.join(" & ")}, including {towns.slice(0, -1).join(", ")} and{" "}
              {towns.at(-1)}.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sand/70">{t("site.footer.farther")}</p>
            <Link href="/locations" className="mt-3 inline-block text-sm underline hover:text-gallery">
              Service area
            </Link>
          </div>

          <div>
            <h2 className="eyebrow mb-4">{t("site.footer.hello")}</h2>
            <ul className="space-y-2.5 text-sm">
              {publicEnv.contactEmail && (
                <li>
                  <ContactLink kind="email" value={publicEnv.contactEmail} className="hover:text-gallery hover:underline" />
                </li>
              )}
              {publicEnv.contactPhone && (
                <li>
                  <ContactLink kind="phone" value={publicEnv.contactPhone} className="hover:text-gallery hover:underline" />
                </li>
              )}
              <li>
                <Link className="hover:text-gallery hover:underline" href="/contact">
                  Contact form
                </Link>
              </li>
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <a className="hover:text-gallery hover:underline" href={s.href} rel="me noopener" target="_blank">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link
              href={site.bookCta.href}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gallery px-5 text-sm font-semibold text-ink hover:bg-sand"
            >
              {t("site.bookCta")}
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-5 border-t border-sand/15 pt-8 text-[0.82rem] text-sand/70 md:flex-row md:items-center md:justify-between">
          <p>
            © <Year /> {site.name}. {t("site.footer.rights")}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li>
              <Link href="/faq" className="hover:text-gallery">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/journal" className="hover:text-gallery">
                Journal
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-gallery">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-gallery">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="hover:text-gallery">
                Accessibility
              </Link>
            </li>
            <li>
              <FlickFooterControl />
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
