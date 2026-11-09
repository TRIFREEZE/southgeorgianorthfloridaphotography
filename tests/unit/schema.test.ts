import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/lib/inquiry/schema";

const base = { kind: "quick", category: "people", name: "Ada", email: "ADA@Example.com ", social: "Ada Lovelace", message: "Family photos in the fall", consent: true };

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

  it("requires a Facebook or Instagram name, and a link is optional", () => {
    expect(inquirySchema.safeParse({ ...base, social: "" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, social: "   " }).success).toBe(false);
    const name = inquirySchema.safeParse({ ...base, social: "  Jane   Smith " });
    expect(name.success && name.data.social).toBe("Jane Smith");
    const handle = inquirySchema.safeParse({ ...base, social: "@ada_l" });
    expect(handle.success && handle.data.social).toBe("@ada_l");
    const link = inquirySchema.safeParse({ ...base, social: "facebook.com/ada.l" });
    expect(link.success && link.data.social).toBe("https://facebook.com/ada.l");
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

  it("accepts a Facebook or Instagram name however people type it", async () => {
    const { normalizeSocial, socialProblem } = await import("@/lib/inquiry/checks");
    expect(normalizeSocial("Jane Smith")).toBe("Jane Smith");
    expect(normalizeSocial("Jane Smith on Facebook")).toBe("Jane Smith on Facebook");
    expect(normalizeSocial("@jane smith")).toBe("@jane smith");
    expect(normalizeSocial("https://www.instagram.com/ada/")).toBe("https://www.instagram.com/ada/");
    expect(normalizeSocial("javascript:alert(1)")).toBe("javascript:alert(1)"); // kept as plain text, never a link
    expect(socialProblem("")).toContain("Facebook or Instagram name");
    expect(socialProblem("<b>x</b>")).not.toBeNull();
  });
});
