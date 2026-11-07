/**
 * Portfolio categories, booking categories and service pages share one taxonomy
 * so a visitor who browses horses lands in the horse booking path, and so on.
 */

export type CategoryId = "people" | "animals" | "weddings-events" | "brands";
export type BookingCategory = "people" | "animals" | "weddings-events" | "business-branding" | "other";

export interface PortfolioCategory {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
  includes: string[];
  serviceSlug: ServiceSlug;
  bookingCategory: BookingCategory;
}

export const portfolioCategories: PortfolioCategory[] = [
  {
    id: "people",
    label: "People & Families",
    short: "People",
    description: "Families, maternity, couples, seniors, individuals and headshots.",
    includes: ["Families", "Maternity", "Couples", "Seniors", "Individuals", "Headshots"],
    serviceSlug: "portraits-families",
    bookingCategory: "people",
  },
  {
    id: "animals",
    label: "Pets & Horses",
    short: "Animals",
    description: "Horses, dogs, cats, farm animals and equestrian portraits.",
    includes: ["Horses", "Equestrian", "Dogs", "Cats", "Farm animals"],
    serviceSlug: "pets-horses",
    bookingCategory: "animals",
  },
  {
    id: "weddings-events",
    label: "Weddings & Celebrations",
    short: "Weddings & events",
    description: "Weddings, engagements, community gatherings and milestone events.",
    includes: ["Weddings", "Engagements", "Milestones", "Community events"],
    serviceSlug: "weddings-events",
    bookingCategory: "weddings-events",
  },
  {
    id: "brands",
    label: "Businesses & Brands",
    short: "Brands",
    description: "Teams, personal brands, products and small businesses.",
    includes: ["Team photos", "Personal brands", "Products", "Small businesses"],
    serviceSlug: "business-branding",
    bookingCategory: "business-branding",
  },
];

export const categoryById = (id: string) => portfolioCategories.find((c) => c.id === id);

export type ServiceSlug = "portraits-families" | "pets-horses" | "weddings-events" | "business-branding";

export interface Service {
  slug: ServiceSlug;
  category: CategoryId;
  bookingCategory: BookingCategory;
  name: string;
  navLabel: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  intro: string;
  pricingMode: "package" | "quote";
  idealFor: string[];
  howItWorks: { title: string; body: string }[];
  timing: string;
  faqs: { q: string; a: string }[];
  cta: string;
}

export const services: Service[] = [
  {
    slug: "portraits-families",
    category: "people",
    bookingCategory: "people",
    name: "Portraits & Families",
    navLabel: "Portraits & families",
    seoTitle: "Family & Portrait Photographer in South Georgia & North Florida",
    seoDescription:
      "Relaxed, natural-light family, maternity, couples, senior and individual portraits across South Georgia and North Florida, priced by finished photos, not minutes.",
    headline: "Photographs of your people, without a countdown.",
    intro:
      "Families, maternity, couples, seniors, individuals and headshots. You choose how many finished photos you'd like, and we take the time it takes to make them good. Nobody's checking a watch while your toddler warms up.",
    pricingMode: "package",
    idealFor: [
      "Family portraits, from newborn-and-up to three generations",
      "Maternity and couples sessions",
      "Senior portraits that actually look like the senior",
      "Individual portraits and professional headshots",
    ],
    howItWorks: [
      {
        title: "Pick a photo count",
        body: "8, 20 or 40 finished photos. That's the promise. The pace follows the people.",
      },
      {
        title: "Plan the light",
        body: "We'll choose a time and a setting that flatter you. Usually that's softer morning or evening light.",
      },
      {
        title: "Loosen up",
        body: "Light direction, a few prompts, lots of room for real moments. Awkward is normal for about five minutes.",
      },
    ],
    timing:
      "Most portrait sessions settle into their own pace. Little ones get breaks, and nobody gets rushed off at minute 30. We'll agree on the plan and any practical limits (daylight, location access) before your date.",
    faqs: [
      {
        q: "What if my kids won't cooperate?",
        a: "Then we wait, play, try again, and photograph what's actually happening. Some of the best family photos come from the minutes everyone thinks are going wrong.",
      },
      {
        q: "Can we do headshots for work?",
        a: "Yes. Individual headshots fit the portrait packages. For a whole team or business usage, the Business & Branding page is a better fit.",
      },
    ],
    cta: "Plan a portrait session",
  },
  {
    slug: "pets-horses",
    category: "animals",
    bookingCategory: "animals",
    name: "Pets & Horses",
    navLabel: "Pets & horses",
    seoTitle: "Horse & Pet Photographer in South Georgia & North Florida",
    seoDescription:
      "Patient, natural-light portraits of horses, dogs, cats and farm animals, with or without their people, across South Georgia and North Florida.",
    headline: "For muddy paws, flying manes, and every personality in between.",
    intro:
      "Horses, dogs, cats, goats, the barn cat who rules everything. Animals don't do schedules, so we don't force one. Sessions are priced by finished photos, and we work at the animal's pace with safety first.",
    pricingMode: "package",
    idealFor: [
      "Equestrian portraits: horse alone, or horse and rider",
      "Dogs who will absolutely not sit",
      "Senior pets and legacy sessions",
      "Farm animals and the people who look after them",
    ],
    howItWorks: [
      {
        title: "Tell us about them",
        body: "Temperament, quirks, what they love, what spooks them. A handler you trust should be there for horses.",
      },
      {
        title: "Meet them where they're comfortable",
        body: "Familiar ground usually means calmer animals and more natural photos. Barns, pastures and backyards are all great.",
      },
      {
        title: "Patience, treats, repeat",
        body: "We take breaks, follow their lead and keep everyone safe. No forced poses, no rushing.",
      },
    ],
    timing:
      "Animal sessions follow the animal. We'll plan around heat, feeding, turnout and light, and pause or reschedule if an animal is stressed. A good photo is never worth an unsafe moment.",
    faqs: [
      {
        q: "Can I bring my horse to a park?",
        a: "Usually the barn or farm is easier and safer. If you have a specific location in mind, we'll check whether horses are allowed and whether the footing and traffic are safe.",
      },
      {
        q: "My dog won't sit still. Is that a problem?",
        a: "Not even a little. Movement, play and a slightly chaotic tongue make some of the best pet photos.",
      },
    ],
    cta: "Plan an animal session",
  },
  {
    slug: "weddings-events",
    category: "weddings-events",
    bookingCategory: "weddings-events",
    name: "Weddings & Events",
    navLabel: "Weddings & events",
    seoTitle: "Wedding & Event Photographer in South Georgia & North Florida",
    seoDescription:
      "Calm, documentary-style wedding, engagement and event photography in South Georgia and North Florida, custom quoted with clear coverage hours.",
    headline: "Be there. I'll remember it for you.",
    intro:
      "Weddings, engagements, elopements, milestone birthdays and community events. You stay present while the day is quietly documented, within the coverage window we agree on together.",
    pricingMode: "quote",
    idealFor: [
      "Weddings and elopements",
      "Engagement sessions",
      "Milestone celebrations and reunions",
      "Community, church and nonprofit events",
    ],
    howItWorks: [
      {
        title: "Share the date and the shape of the day",
        body: "Venue, timeline, guest count and the moments you can't miss.",
      },
      {
        title: "Get a clear quote",
        body: "Contracted coverage hours, deliverables, travel and any second-shooter options, in writing.",
      },
      {
        title: "Plan the timeline together",
        body: "We'll build in light, portraits and breathing room so the day doesn't feel like a production schedule.",
      },
    ],
    timing:
      "Unlike portrait sessions, events have a contracted coverage window. That's what keeps the day fair, predictable and well planned. Additional time can be arranged in advance.",
    faqs: [
      {
        q: "Do you have unlimited coverage?",
        a: "No. Events are booked for a specific coverage window so you know exactly what's included. If the day runs long, we'll talk about extending ahead of time.",
      },
      {
        q: "Is a second photographer available?",
        a: "Ask when you inquire. It depends on the date and the event, and it's always quoted up front.",
      },
    ],
    cta: "Ask about my date",
  },
  {
    slug: "business-branding",
    category: "brands",
    bookingCategory: "business-branding",
    name: "Business & Branding",
    navLabel: "Business & branding",
    seoTitle: "Brand & Business Photographer in South Georgia & North Florida",
    seoDescription:
      "Personal brand portraits, team headshots, product and small-business photography for South Georgia and North Florida businesses, quoted on usage and scope.",
    headline: "Look like the business you're building.",
    intro:
      "Personal brands, teams, products, storefronts and the people behind them. Natural, editorial images you'll actually use on your website, socials and print, quoted on what you need and how you'll use it.",
    pricingMode: "quote",
    idealFor: [
      "Personal brand and founder portraits",
      "Team headshots that match",
      "Product and menu photography",
      "Behind-the-scenes and storefront stories",
    ],
    howItWorks: [
      {
        title: "Tell us how you'll use the images",
        body: "Website refresh, social calendar, ads, print. Usage shapes the shot list and the license.",
      },
      {
        title: "Get a clear scope",
        body: "Shot list, headcount, deliverables, usage rights and timeline, quoted in writing.",
      },
      {
        title: "Shoot efficiently, look natural",
        body: "Organized enough to respect your workday, relaxed enough that nobody looks like a stock photo.",
      },
    ],
    timing:
      "Business sessions are scheduled around a clear shot list and agreed time on site, especially when there's a team, a rented space or restricted access involved.",
    faqs: [
      {
        q: "Can we use the photos in ads?",
        a: "Yes, with the right license. Tell us where the images will appear and we'll include the appropriate usage in your quote.",
      },
      {
        q: "Can you photograph our whole team in one visit?",
        a: "Usually, yes. We'll plan a simple setup that keeps headshots consistent and the line moving.",
      },
    ],
    cta: "Start planning",
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);

export const bookingCategories: { id: BookingCategory; label: string; hint: string; portfolio?: CategoryId }[] = [
  { id: "people", label: "People", hint: "Family, couple, maternity, senior, individual", portfolio: "people" },
  { id: "animals", label: "Pets & horses", hint: "Horses, dogs, cats, farm animals", portfolio: "animals" },
  { id: "weddings-events", label: "Wedding or event", hint: "Weddings, engagements, celebrations", portfolio: "weddings-events" },
  { id: "business-branding", label: "Business & branding", hint: "Teams, personal brand, products", portfolio: "brands" },
  { id: "other", label: "Something else", hint: "Tell us your idea" },
];
