import { describe, expect, it } from "vitest";
import { defaultContent } from "@/lib/cms/defaults";
import { bookingOptions } from "@/lib/cms/sessions";
import { bookingSchema, galleryDeliverySchema } from "@/lib/inquiry/compose";
import type { EmailContext } from "@/lib/inquiry/emails";
import { bookingConfirmedEmail, galleryDeliveryEmail } from "@/lib/inquiry/sent-emails";

const content = defaultContent();
const options = bookingOptions(content, { includeHidden: true });
const ctx: EmailContext = { content, options, siteUrl: "https://southstill.example" };
const pkgOpt = options.find((o) => o.pricingMode === "package")!;

describe("booking confirmed email", () => {
  const b = bookingSchema.parse({
    name: "Jane Smith",
    email: "Jane@Example.com",
    category: pkgOpt.bookingId,
    packageId: pkgOpt.packageIds[0],
    date: "2026-12-05",
    time: "4:30 PM",
    place: "The pecan grove gate",
    note: "So excited!\n<b>See you</b> soon.",
  });
  const m = bookingConfirmedEmail(b, ctx);

  it("follows How it works with 01–02 done and 03 coming soon", () => {
    expect(m.subject).toContain("Saturday, December 5, 2026");
    expect(m.html).toContain("You&#39;re booked, Jane!");
    const i3 = m.html.indexOf("Relax &amp; shoot");
    expect(m.html.lastIndexOf("Coming soon", i3)).toBeGreaterThan(m.html.indexOf("Plan the light &amp; location")); // the tag sits on step 03
    expect((m.html.match(/&#10003; Done/g) ?? []).length).toBe(2);
    expect(m.html).toContain("See you Saturday, December 5, 2026, 4:30 PM.");
    expect(m.html).toContain("The pecan grove gate");
    expect(m.html).not.toContain("before you book");
  });

  it("keeps the owner's note, escaped, with its line breaks", () => {
    expect(m.html).toContain("So excited!<br>&lt;b&gt;See you&lt;/b&gt; soon.");
    expect(m.text).toContain("So excited!");
  });

  it("uses an owner-written price instead of the estimate", () => {
    const priced = bookingConfirmedEmail({ ...b, price: "$450, deposit paid" }, ctx);
    expect(priced.html).toContain("$450, deposit paid");
  });

  it("needs a name, a real email, a session type and a date", () => {
    const r = bookingSchema.safeParse({ name: "", email: "jane@gmail", category: "", date: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(["category", "date", "email", "name"]);
  });
});

describe("gallery ready email", () => {
  const g = galleryDeliverySchema.parse({ name: "Jane Smith", email: "jane@example.com", link: "https://southstill.example/client-gallery/smith-x7k2", password: "pecan-sunset-42", expires: "2027-01-31" });
  const m = galleryDeliveryEmail(g, ctx);

  it("has the link as a button, the password set apart and the expiry", () => {
    expect(m.subject).toBe("Your photos are ready, Jane");
    expect(m.html).toContain('href="https://southstill.example/client-gallery/smith-x7k2"');
    expect(m.html).toContain("pecan-sunset-42");
    expect(m.html).toContain("Sunday, January 31, 2027");
    expect(m.text).toContain("pecan-sunset-42");
  });

  it("only accepts real web links", () => {
    expect(galleryDeliverySchema.safeParse({ ...g, link: "javascript:alert(1)" }).success).toBe(false);
    expect(galleryDeliverySchema.safeParse({ ...g, link: "southstill.example/x" }).success).toBe(false);
  });
});
