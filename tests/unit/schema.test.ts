import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/lib/inquiry/schema";

const base = { kind: "quick", category: "people", name: "Ada", email: "ADA@Example.com ", message: "Family photos in the fall", consent: true };

describe("inquirySchema", () => {
  it("accepts a valid quick inquiry and normalizes email", () => {
    const r = inquirySchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ada@example.com");
  });

  it("requires consent", () => {
    const r = inquirySchema.safeParse({ ...base, consent: false });
    expect(r.success).toBe(false);
  });

  it("accepts form-encoded checkbox values", () => {
    expect(inquirySchema.safeParse({ ...base, consent: "on" }).success).toBe(true);
  });

  it("rejects bad email, ZIP and oversized fields", () => {
    expect(inquirySchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, zip: "1234" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, message: "x".repeat(5000) }).success).toBe(false);
  });

  it("requires a phone number when text messages are opted in", () => {
    const r = inquirySchema.safeParse({ ...base, smsOptIn: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "phone")).toBe(true);
    expect(inquirySchema.safeParse({ ...base, smsOptIn: true, phone: "(229) 555-0100" }).success).toBe(true);
  });

  it("lets the wizard omit a free-text message", () => {
    expect(inquirySchema.safeParse({ ...base, kind: "wizard", message: "" }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, kind: "quick", message: "" }).success).toBe(false);
  });

  it("rejects unknown categories and packages", () => {
    expect(inquirySchema.safeParse({ ...base, category: "drones" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, packageId: "mega" }).success).toBe(false);
  });
});
