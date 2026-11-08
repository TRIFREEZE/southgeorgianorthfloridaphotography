import type { SiteContent } from "@/lib/cms/schema";
import { bookingOptions, sessionTypes } from "@/lib/cms/sessions";
import { textOf } from "@/lib/cms/texts";
import type { GuideData } from "./guide";

/** What Ask Flick knows, taken from the published content (pricing, categories, FAQs, founders). */
export function guideData(content: SiteContent): GuideData {
  const types = sessionTypes(content);
  return {
    pricing: content.pricing,
    faqs: content.faqs.map((f) => ({ id: f.id, q: f.q, a: f.a })),
    sessions: bookingOptions(content)
      .filter((o) => o.bookingId !== "other")
      .map((o) => {
        const s = types.find((x) => x.bookingId === o.bookingId)!;
        return { bookingId: o.bookingId, label: o.label, name: s.name, hint: o.hint, intro: s.intro, href: o.href, pricingMode: o.pricingMode, packageIds: o.packageIds, quoteIntro: o.quoteIntro, words: [...s.idealFor, s.description, s.label] };
      }),
    founders: [
      { name: textOf(content.texts, "about.name"), role: textOf(content.texts, "about.role") },
      { name: textOf(content.texts, "about.name2"), role: textOf(content.texts, "about.role2") },
    ],
  };
}
