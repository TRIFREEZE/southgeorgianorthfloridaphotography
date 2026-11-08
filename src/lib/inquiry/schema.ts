import { z } from "zod";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const bool = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true" || v === "1");

/** Booking options come from the owner's categories, so any short id is accepted; the server maps unknown ones to "other". */
export const bookingCategoryId = z.string().trim().regex(/^[a-z0-9-]{1,70}$/, "Choose what we're photographing.");

/**
 * One schema for every inquiry path (quick form, wizard, contact, story card).
 * Validated on the server for every request; the client uses it for inline errors.
 */
export const inquirySchema = z
  .object({
    kind: z.enum(["quick", "wizard", "contact", "story"]).default("quick"),
    category: bookingCategoryId.default("other"),
    packageId: z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    extraPhotos: z.coerce.number().int().min(0).max(60).optional().default(0),
    addOns: z.array(z.string().max(40)).max(10).optional().default([]),
    groupDetails: opt(160),
    animals: opt(240),
    specialNeeds: opt(800),
    locationPreference: opt(200),
    city: opt(120),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "Use a 5-digit ZIP code.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    dateFlexibility: z.enum(["flexible", "specific", "range"]).optional().or(z.literal("").transform(() => undefined)),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    preferredDateAlt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    preferredTime: z.enum(["morning", "midday", "evening", "any"]).optional().or(z.literal("").transform(() => undefined)),
    travelNotes: opt(400),
    name: z.string().trim().min(1, "Please add your name.").max(120, "That name is a little long."),
    email: z.string().trim().toLowerCase().max(200).pipe(z.email("Please check your email address.")),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v === "" || /^[+()\-.\s\d]{7,}$/.test(v), "Please check your phone number.")
      .optional()
      .transform((v) => (v ? v : undefined)),
    smsOptIn: bool,
    message: opt(4000),
    inspirationIds: z.array(z.string().max(64)).max(12).optional().default([]),
    storySubject: opt(40),
    storyFeeling: opt(40),
    consent: bool.refine((v) => v === true, "Please agree to the privacy policy so we can reply."),
    utm: z
      .object({
        source: opt(120),
        medium: opt(120),
        campaign: opt(120),
        term: opt(120),
        content: opt(120),
      })
      .partial()
      .optional(),
    landingPath: opt(300),
    referrer: opt(300),
    // Anti-spam fields
    company_website: z.string().max(200).optional(),
    startedAt: z.coerce.number().optional(),
    turnstileToken: z.string().max(4096).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.smsOptIn && !v.phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Add a phone number to receive texts, or untick the text option." });
    }
    if (v.kind !== "wizard" && v.kind !== "story" && !v.message) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "Tell us a little about what you have in mind." });
    }
  });

export type InquiryInput = z.input<typeof inquirySchema>;
export type Inquiry = z.output<typeof inquirySchema>;

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
