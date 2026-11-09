import "server-only";
import { getSiteData } from "@/lib/cms/data";
import { draftContent } from "@/lib/cms/ops";
import { getRepo } from "@/lib/cms/repo";
import { bookingOptions } from "@/lib/cms/sessions";
import { publicEnv } from "@/lib/env";
import { clientConfirmationEmail, ownerNotificationEmail, type EmailContext } from "./emails";
import { estimate, packagesFor } from "./estimate";
import { inquirySchema } from "./schema";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/**
 * Both emails filled with a clearly made-up sample inquiry, using the draft wording
 * (so the owner sees edits before publishing).
 */
export async function sampleEmails() {
  const repo = getRepo();
  const content = repo ? await draftContent(repo) : (await getSiteData()).content;
  const options = bookingOptions(content, { includeHidden: true });
  const opt = options.find((o) => o.pricingMode === "package") ?? options[0];
  const pkg = packagesFor(opt.bookingId, content.pricing, options).find((p) => p.priceCents != null);
  const sample = inquirySchema.parse({
    kind: "wizard",
    category: opt.bookingId,
    packageId: pkg?.id ?? "",
    extraPhotos: pkg ? 2 : 0,
    name: "Sample Client",
    email: "sample.client@example.com",
    social: "Sample Client",
    phone: "(229) 555-0142",
    smsOptIn: true,
    city: "Thomasville, GA",
    zip: "31792",
    dateFlexibility: "range",
    preferredDate: day(24),
    preferredDateAlt: day(31),
    preferredTime: "evening",
    groupDetails: "Two adults, two kids and a very patient dog",
    message: "This is a sample inquiry, so you can see how the emails look.\nWe'd love something relaxed outdoors.",
    consent: true,
  });
  const est = estimate({ category: sample.category, packageId: sample.packageId, extraPhotos: sample.extraPhotos, addOns: sample.addOns }, content.pricing, options);
  const ctx: EmailContext = { content, options, siteUrl: publicEnv.siteUrl, contactEmail: publicEnv.contactEmail, contactPhone: publicEnv.contactPhone };
  const ref = "RCL-SAMPLE";
  return { client: clientConfirmationEmail(sample, ref, est, ctx), owner: ownerNotificationEmail(sample, ref, est, ctx) };
}
