import { z } from "zod";
import { emailProblem } from "./checks";

/** Emails the owner writes and sends from the dashboard. Shared by the form (browser) and the server. */

const text = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`).optional().default("");
const email = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((v, ctx) => {
    const p = emailProblem(v);
    if (p) ctx.addIssue({ code: "custom", message: p });
  });
const isoDate = (msg: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg);

export const bookingSchema = z.object({
  name: z.string().trim().min(1, "Add the client's name.").max(120),
  email,
  phone: text(40),
  social: text(120),
  category: z.string().trim().regex(/^[a-z0-9-]{1,70}$/, "Choose the session type."),
  packageId: z.string().regex(/^[a-z0-9-]{0,40}$/).optional().default(""),
  extraPhotos: z.coerce.number().int().min(0).max(60).default(0),
  addOns: z.array(z.string().max(40)).max(10).default([]),
  date: isoDate("Choose the session date."),
  time: text(60),
  place: text(300),
  city: text(120),
  groupDetails: text(160),
  animals: text(240),
  specialNeeds: text(800),
  /** Overrides the calculated estimate, e.g. "$250 (deposit paid)". */
  price: text(120),
  /** The owner's own words, shown near the top. */
  note: text(4000),
  /** Also add it to Leads as Booked. */
  saveLead: z.boolean().default(true),
});

export const galleryDeliverySchema = z.object({
  name: z.string().trim().min(1, "Add the client's name.").max(120),
  email,
  link: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https?:\/\/\S+\.\S+/i.test(v), "Paste the full gallery link, starting with https://"),
  password: z.string().trim().min(1, "Add the gallery password.").max(100),
  expires: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid date.")
    .optional()
    .default(""),
  note: text(4000),
});

export type BookingInput = z.output<typeof bookingSchema>;
export type GalleryDeliveryInput = z.output<typeof galleryDeliverySchema>;

export function composeErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
