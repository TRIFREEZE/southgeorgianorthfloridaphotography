import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/lib/inquiry/schema";

const base = { kind: "quick", category: "people", name: "Ada", email: "ADA@Example.com ", social: "facebook.com/ada.l", message: "Family photos in the fall", consent: true };

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

  it("accepts the owner's own categories and packages, but only as safe ids", () => {
    expect(inquirySchema.safeParse({ ...base, category: "cars-trucks-bikes", packageId: "custom" }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, category: "Drones; drop table" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, packageId: "<mega>" }).success).toBe(false);
  });

  it("requires a social link and stores it as a full link or @username", () => {
    expect(inquirySchema.safeParse({ ...base, social: "" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, social: "Jane Smith" }).success).toBe(false);
    const a = inquirySchema.safeParse({ ...base, social: "facebook.com/ada.l" });
    expect(a.success && a.data.social).toBe("https://facebook.com/ada.l");
    const b = inquirySchema.safeParse({ ...base, social: "@ada_l" });
    expect(b.success && b.data.social).toBe("@ada_l");
  });
});

describe("plain-language checks", () => {
  it("explains what's wrong with an email address", async () => {
    const { emailProblem, emailSuggestion } = await import("@/lib/inquiry/checks");
    expect(emailProblem("ada.example.com")).toContain("missing the “@”");
    expect(emailProblem("ada@gmail")).toContain("missing its ending");
    expect(emailProblem("ada @gmail.com")).toContain("space");
    expect(emailProblem("ada@gmail,com")).toContain("comma");
    expect(emailProblem("ada@gmail.com")).toBeNull();
    expect(emailSuggestion("ada@gmial.com")).toBe("ada@gmail.com");
    expect(emailSuggestion("ada@yahoo.con")).toBe("ada@yahoo.com");
    expect(emailSuggestion("ada@gmail.com")).toBeNull();
    expect(emailSuggestion("ada@southstill.co")).toBeNull();
  });

  it("accepts social links in the forms people actually type", async () => {
    const { normalizeSocial, socialProblem } = await import("@/lib/inquiry/checks");
    expect(normalizeSocial("https://www.instagram.com/ada/")).toBe("https://www.instagram.com/ada/");
    expect(normalizeSocial("fb.com/ada")).toBe("https://fb.com/ada");
    expect(normalizeSocial("javascript:alert(1)")).toBeNull();
    expect(socialProblem("@ada smith")).toContain("@username");
    expect(socialProblem("")).toContain("Facebook");
  });
});
