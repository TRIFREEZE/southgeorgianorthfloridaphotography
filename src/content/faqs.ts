import { pricing, formatPrice } from "./pricing";
import { site } from "./site";

export interface Faq {
  id: string;
  q: string;
  a: string;
  topic: "session" | "pricing" | "animals" | "events" | "delivery" | "rights";
  /** Shown in the homepage FAQ preview. */
  home?: boolean;
}

const extra = formatPrice(pricing.extraPhoto.priceCents);

export const faqs: Faq[] = [
  {
    id: "awkward",
    topic: "session",
    home: true,
    q: "What if I feel awkward in front of a camera?",
    a: "Almost everyone does for the first few minutes. You won't be left to figure out what to do with your hands. You'll get simple prompts, things to do rather than poses to hold, and time to settle in. Nobody's rushing you toward a finish line.",
  },
  {
    id: "time",
    topic: "session",
    home: true,
    q: "How much time do we get?",
    a: `For standard portrait sessions there's no stopwatch. We work until we've made your chosen number of strong, finished photos, within sensible limits like daylight, weather, location access, and how much energy little ones and animals have. ${pricing.noStopwatch.boundaries}`,
  },
  {
    id: "pets-move",
    topic: "animals",
    home: true,
    q: "My pet won't sit still. Is that okay?",
    a: "Completely. Good dogs don't need to sit. Movement, play and personality often make the best frames. We'll work at their pace, with treats, breaks and a familiar person nearby.",
  },
  {
    id: "horse",
    topic: "animals",
    home: true,
    q: "Can I bring my horse?",
    a: "Yes, please. Horse portraits usually work best at your barn or farm, with an experienced handler. We'll plan around footing, heat, flies and feeding times, and safety always comes before the shot.",
  },
  {
    id: "weather",
    topic: "session",
    home: true,
    q: "What happens if the weather changes?",
    a: "South Georgia and North Florida weather has opinions. If rain, storms or dangerous heat make a session unsafe or unflattering, we'll reschedule together. Overcast skies, though, can be beautiful for portraits.",
  },
  {
    id: "turnaround",
    topic: "delivery",
    home: true,
    q: "When will I get my photos?",
    a: site.turnaroundCopy ?? site.provisionalTurnaroundCopy,
  },
  {
    id: "rights",
    topic: "rights",
    home: true,
    q: "Who owns the photos? Can I print them?",
    a: "Portrait packages include a personal-use print release, so you can print, frame and share your photos with family and friends. The photographer keeps the copyright, which is standard. Business and advertising use is licensed separately and included in business quotes.",
  },
  {
    id: "weddings",
    topic: "events",
    home: true,
    q: "Do you photograph weddings?",
    a: "Yes. Weddings, engagements and events are custom quoted with a contracted coverage window, clear deliverables and travel up front. The no-stopwatch approach is for portrait sessions. Events always have agreed hours.",
  },
  {
    id: "more-photos",
    topic: "pricing",
    q: "Can I buy more photos than my package includes?",
    a: `Yes. Additional finished photos are ${extra} each, chosen from your gallery.`,
  },
  {
    id: "travel",
    topic: "pricing",
    q: "Do you travel?",
    a: `${pricing.travel.copy} ${site.serviceArea.outsideAreaNote}`,
  },
  {
    id: "deposit",
    topic: "pricing",
    q: "Do I pay anything to inquire?",
    a: "No. Inquiries are free and don't commit you to anything. We'll reply personally, confirm availability and scope, and only then talk about reserving your date.",
  },
  {
    id: "what-to-wear",
    topic: "session",
    q: "What should we wear?",
    a: "Comfortable clothes you already feel good in, in colors that get along rather than match exactly. Earthy tones, soft neutrals and one or two richer colors photograph beautifully here. After you book you'll get a simple guide.",
  },
  {
    id: "edits",
    topic: "delivery",
    q: "Can I request edits or changes?",
    a: pricing.revisionPolicy,
  },
  {
    id: "raw",
    topic: "delivery",
    q: "Do I get the unedited files?",
    a: "No. You receive finished, edited photographs, the ones that are actually ready to keep. Unedited files aren't part of the deliverable.",
  },
];
