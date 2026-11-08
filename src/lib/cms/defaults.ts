import { faqs as defaultFaqs } from "@/content/faqs";
import { defaultPricing } from "@/content/pricing";
import { reviews } from "@/content/reviews";
import { portfolioCategories, services } from "@/content/services";
import { categoriesSchema, faqsSchema, layoutSchema, pricingSchema, testimonialsSchema, type SiteContent } from "./schema";

const SERVICE_TOPIC: Record<string, "session" | "animals" | "events"> = { "pets-horses": "animals", "weddings-events": "events" };

/** The site's original content: what visitors see until the owner publishes edits. */
export function defaultContent(): SiteContent {
  return {
    layout: layoutSchema.parse({}),
    categories: categoriesSchema.parse(portfolioCategories.map((c) => ({ id: c.id, slug: c.id, label: c.label, description: c.description, visible: true }))),
    pricing: pricingSchema.parse(JSON.parse(JSON.stringify(defaultPricing))),
    texts: {},
    faqs: faqsSchema.parse([
      ...defaultFaqs.map((f) => ({ id: f.id, q: f.q, a: f.a, topic: f.topic, home: Boolean(f.home) })),
      // Service-page questions live in the same list so they're editable too.
      ...services.flatMap((s) =>
        s.faqs.map((f, i) => ({ id: `${s.slug}-${i + 1}`, q: f.q, a: f.a, topic: SERVICE_TOPIC[s.slug] ?? "session", faqPage: false, services: [s.slug] })),
      ),
    ]),
    testimonials: testimonialsSchema.parse(reviews.map((r) => ({ id: r.id, quote: r.quote, name: r.name, context: r.context ?? "", date: r.date, consent: true, published: true }))),
  };
}
