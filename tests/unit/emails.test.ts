import { describe, expect, it } from "vitest";
import { defaultContent } from "@/lib/cms/defaults";
import { bookingOptions } from "@/lib/cms/sessions";
import { clientConfirmationEmail, ownerNotificationEmail, socialLookup, type EmailContext } from "@/lib/inquiry/emails";
import { estimate } from "@/lib/inquiry/estimate";
import { inquirySchema } from "@/lib/inquiry/schema";

const content = defaultContent();
const options = bookingOptions(content, { includeHidden: true });
const ctx: EmailContext = { content, options, siteUrl: "https://southstill.example", contactEmail: "hello@southstill.example" };
const pkgOpt = options.find((o) => o.pricingMode === "package")!;
const d = inquirySchema.parse({
  kind: "wizard",
  category: pkgOpt.bookingId,
  packageId: pkgOpt.packageIds[0],
  name: "Jane <b>Smith</b>",
  email: "jane@example.com",
  social: "Jane Smith",
  message: "Line one\n<script>alert(1)</script>",
  dateFlexibility: "specific",
  preferredDate: "2027-03-14",
  consent: true,
});
const est = estimate({ category: d.category, packageId: d.packageId, extraPhotos: 0, addOns: [] }, content.pricing, options);

describe("client confirmation email", () => {
  const mail = clientConfirmationEmail(d, "RCL-TEST12", est, ctx);

  it("follows How it works and makes the key promises", () => {
    expect(mail.html).toContain("Inquiry received");
    expect(mail.html).toContain("RCL-TEST12");
    expect(mail.html).toContain("reply personally");
    expect(mail.html).toContain("Nothing is reserved or charged");
    expect(mail.html).toContain("Happening now");
    for (const step of ["Tell us your idea", "Plan the light &amp; location", "Relax &amp; shoot", "Choose &amp; receive"]) expect(mail.html).toContain(step);
    expect(mail.html).toContain("Sunday, March 14, 2027");
    expect(mail.html).toContain("https://southstill.example/email/southstill-logo.png");
    expect(mail.text).toContain("RCL-TEST12");
    expect(mail.subject).toBe("We got your note · Southstill");
  });

  it("escapes everything the visitor typed", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<b>Smith");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("uses the owner's edited wording", () => {
    const edited = { ...content, texts: { ...content.texts, "email.title": "Hey {first}!", "email.subject": "Got it ({ref})" } };
    const m = clientConfirmationEmail(d, "RCL-X", est, { ...ctx, content: edited });
    expect(m.subject).toBe("Got it (RCL-X)");
    expect(m.html).toContain("Hey Jane!");
  });
});

describe("owner email", () => {
  it("uses the owner's edited wording too", () => {
    const edited = { ...content, texts: { ...content.texts, "ownerEmail.subject": "Lead: {first} ({estimate})", "ownerEmail.replyButton": "Write back to {first}", "emailLabel.session": "Kind of shoot" } };
    const m = ownerNotificationEmail(d, "RCL-1", est, { ...ctx, content: edited });
    expect(m.subject).toMatch(/^Lead: Jane \(\$\d+\)$/);
    expect(m.html).toContain("Write back to Jane");
    expect(m.html).toContain("Kind of shoot");
  });

  it("has reply and dashboard buttons and a way to find them", () => {
    const m = ownerNotificationEmail(d, "RCL-TEST12", est, ctx, "0b5c2a8e-0000-4000-8000-000000000000");
    expect(m.html).toContain("mailto:jane@example.com");
    expect(m.html).toContain("https://southstill.example/admin/leads/0b5c2a8e-0000-4000-8000-000000000000");
    expect(m.html).toContain("facebook.com/search/people/?q=Jane%20Smith");
    expect(m.html).not.toContain("<script>");
  });

  it("turns a name, @username or link into a lookup", () => {
    expect(socialLookup("@jane.s")?.href).toBe("https://www.instagram.com/jane.s/");
    expect(socialLookup("https://facebook.com/jane")?.href).toBe("https://facebook.com/jane");
    expect(socialLookup("javascript:alert(1)")?.href).toContain("facebook.com/search");
  });
});
