import type { Metadata } from "next";
import type { Faq, Pricing } from "@/lib/cms/schema";
import { site } from "@/content/site";
import type { Service } from "@/content/services";
import { isProductionDeployment, publicEnv, socialLinks } from "@/lib/env";

export const absoluteUrl = (path = "/") => `${publicEnv.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.shortName,
      title,
      description,
      url: path,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex || !isProductionDeployment ? { index: false, follow: !noindex } : undefined,
  };
}

const ORG_ID = () => absoluteUrl("/#business");

/**
 * ProfessionalService for a service-area business: no street address is published
 * (never expose a home address), areaServed lists only the towns in site.ts.
 */
export function businessJsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": ORG_ID(),
    name: site.name,
    alternateName: `${site.shortName} Photography`,
    url: absoluteUrl("/"),
    description: site.description,
    slogan: site.primaryLine,
    logo: absoluteUrl("/icon.svg"),
    image: absoluteUrl("/opengraph-image"),
    priceRange: "$$",
    areaServed: [
      ...site.serviceArea.towns.map((t) => ({ "@type": "City", name: `${t.name}, ${t.state}` })),
      ...site.serviceArea.regionsServed.map((r) => ({ "@type": "AdministrativeArea", name: r })),
    ],
    knowsAbout: ["Portrait photography", "Family photography", "Pet photography", "Equestrian photography", "Wedding photography", "Brand photography"],
  };
  if (publicEnv.contactEmail) data.email = publicEnv.contactEmail;
  if (publicEnv.contactPhone) data.telephone = publicEnv.contactPhone;
  if (socialLinks.length) data.sameAs = socialLinks.map((s) => s.href);
  if (site.business.legalName) data.legalName = site.business.legalName;
  if (site.business.foundingYear) data.foundingDate = String(site.business.foundingYear);
  return data;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: site.shortName,
    publisher: { "@id": ORG_ID() },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function serviceJsonLd(service: Service, pricing: Pricing) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: `${service.name} photography`,
    description: service.seoDescription,
    url: absoluteUrl(`/services/${service.slug}`),
    provider: { "@id": ORG_ID() },
    areaServed: site.serviceArea.regionsServed,
  };
  if (service.pricingMode === "package") {
    data.offers = pricing.packages.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      description: `${p.photos} finished edited photos`,
    }));
  }
  return data;
}

export function faqJsonLd(items: Pick<Faq, "q" | "a">[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
