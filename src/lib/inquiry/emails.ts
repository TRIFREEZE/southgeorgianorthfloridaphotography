/**
 * The emails an inquiry sends, in Southstill's look:
 * - the client's confirmation, which follows "How it works" (step 01 is happening now:
 *   a real person replies personally, confirms availability and scope; nothing is booked
 *   or charged until the details are agreed) and repeats back everything they sent;
 * - the owner's heads-up, built for replying fast.
 * Pure functions (no sending), so the dashboard can preview them and tests can check them.
 */
import { formatPrice, packagePhotos, packagePrice } from "@/content/pricing";
import type { SiteContent } from "@/lib/cms/schema";
import type { BookingOption } from "@/lib/cms/sessions";
import { editedExperience, textOf } from "@/lib/cms/texts";
import { button, C, callout, esc, card, details, divider, eyebrow, h2, para, refBox, row, shell, steps, tagline, title, type Detail } from "@/lib/email-design";
import type { Estimate } from "./estimate";
import type { Inquiry } from "./schema";

export interface EmailContext {
  content: SiteContent;
  options: BookingOption[];
  /** Absolute site address, for links and the logo image. */
  siteUrl: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

const TIME: Record<string, string> = { morning: "Morning (soft light, cooler)", midday: "Midday", evening: "Evening / golden hour", any: "Whatever works best" };

function niceDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const domainOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** A link the owner can tap to find someone from a typed name or @username. */
export function socialLookup(social: string): { href: string; label: string } | null {
  if (/^https?:\/\//i.test(social)) return { href: social, label: "Open profile" };
  const handle = social.match(/^@([a-z0-9._]{1,30})$/i)?.[1];
  if (handle) return { href: `https://www.instagram.com/${handle}/`, label: "Look up on Instagram" };
  return { href: `https://www.facebook.com/search/people/?q=${encodeURIComponent(social)}`, label: "Search on Facebook" };
}

/** Everything the visitor told us, in plain words, in the order they answered. */
function summary(d: Inquiry, est: Estimate, ctx: EmailContext, forOwner: boolean): Detail[] {
  const t = (k: string) => textOf(ctx.content.texts, k);
  const { pricing } = ctx.content;
  const session = ctx.options.find((o) => o.bookingId === d.category)?.label ?? "Something else";
  const pkg = pricing.packages.find((p) => p.id === d.packageId);
  const priced = est.kind === "package";
  const addOns = (d.addOns ?? []).map((id) => pricing.addOns.find((a) => a.id === id)?.name ?? id);
  const when =
    d.dateFlexibility === "specific"
      ? niceDate(d.preferredDate)
      : d.dateFlexibility === "range"
        ? [niceDate(d.preferredDate), niceDate(d.preferredDateAlt)].filter(Boolean).join(" or ")
        : "Flexible";
  const story = [d.storySubject, d.storyFeeling].filter(Boolean).join(" · ");
  const look = socialLookup(d.social);
  const list: Detail[] = [
    { k: "Session", v: session },
    { k: "Photos", v: pkg ? `${pkg.name}: ${packagePhotos(pkg)} photos, ${packagePrice(pkg)}` : "" },
    { k: "Extra photos", v: priced && d.extraPhotos ? `${d.extraPhotos} (${formatPrice(pricing.extraPhoto.priceCents * d.extraPhotos)})` : "" },
    { k: "Add-ons", v: addOns.join(", ") },
    { k: "Estimate", v: est.kind === "incomplete" ? "" : est.label, extra: forOwner ? undefined : t("email.estimateNote") },
    { k: "Who's in the photos", v: d.groupDetails ?? "" },
    { k: "Animals", v: d.animals ?? "" },
    { k: "Setting", v: d.locationPreference ?? "" },
    { k: "Where", v: [d.city, d.zip].filter(Boolean).join(" ") },
    { k: "When", v: d.kind === "wizard" ? when : "" },
    { k: "Time of day", v: d.preferredTime ? (TIME[d.preferredTime] ?? d.preferredTime) : "" },
    { k: "Travel notes", v: d.travelNotes ?? "" },
    { k: "Plan around", v: d.specialNeeds ?? "" },
    { k: "Story card", v: story },
    { k: "Facebook / Instagram", v: d.social, href: forOwner ? look?.href : undefined, extra: forOwner && look && !/^https?:/i.test(d.social) ? look.label : undefined },
    { k: "Phone", v: d.phone ?? "", href: forOwner && d.phone ? `tel:${d.phone.replace(/[^\d+]/g, "")}` : undefined, extra: d.phone ? (d.smsOptIn ? "OK to text" : "Calls or email only (no texts)") : undefined },
    { k: forOwner ? "Their note" : "Your note", v: d.message ?? "" },
    { k: "Inspiration", v: d.inspirationIds?.length ? `${d.inspirationIds.length} saved photo${d.inspirationIds.length === 1 ? "" : "s"}` : "" },
  ];
  return list.filter((x) => x.v.trim());
}

const plain = (items: Detail[]) => items.map((x) => `${x.k}: ${x.v}${x.extra ? ` (${x.extra})` : ""}`).join("\n");

/* ------------------------------------------------------------------ client confirmation */

export function clientConfirmationEmail(d: Inquiry, ref: string, est: Estimate, ctx: EmailContext): BuiltEmail {
  const texts = ctx.content.texts;
  const first = d.name.trim().split(/\s+/)[0] || d.name;
  const site = domainOf(ctx.siteUrl);
  const vars = { first, ref, site };
  const t = (k: string) => textOf(texts, k, vars);
  const home = ctx.siteUrl;

  // "How it works", exactly as the site shows it (including any wording the owner edited).
  const exp = editedExperience(texts).steps;
  const delivery = textOf(texts, "delivery.turnaround");
  const how = exp.map((s, i) => ({
    n: s.n,
    title: s.title,
    body: i === 0 ? t("email.nowBody") : s.short,
    tag: i === 0 ? t("email.nowTag") : undefined,
    note: i === exp.length - 1 ? delivery : undefined,
  }));

  const items = summary(d, est, ctx, false);
  const contactLine = [ctx.contactEmail, ctx.contactPhone].filter(Boolean).join(" · ");

  const body = card(
    [
      row(eyebrow(t("email.eyebrow")), "8px 40px 0"),
      row(title(t("email.title")), "0 40px"),
      row(para(t("email.intro"), { size: 17 })),
      row(callout(t("email.promiseBold"), t("email.promise")), "20px 40px 0"),
      row(refBox(t("email.refLabel"), ref, t("email.refNote")), "14px 40px 0"),
      row(divider() + h2(t("email.stepsTitle")) + steps(how), "0 40px"),
      row(divider() + h2(t("email.summaryTitle")) + `<div style="margin-top:10px;">${details(items)}</div>` + para(t("email.summaryNote"), { size: 14, color: C.muted, margin: "12px 0 0" }), "0 40px"),
      row(divider() + h2(t("email.replyTitle")) + para(t("email.replyNote")) + para(t("email.spamNote"), { size: 14, color: C.muted, margin: "8px 0 0" }), "0 40px"),
      row(
        divider() +
          h2(t("email.waitTitle")) +
          `<div style="margin-top:14px;">${button(textOf(texts, "thanks.cta1"), `${home}/portfolio`)}${button(textOf(texts, "thanks.cta2"), `${home}/journal`, "light")}</div>`,
        "0 40px",
      ),
      row(divider() + para(t("email.signoff"), { margin: "0" }) + para(t("email.signature"), { margin: "2px 0 0", color: C.ink }) + `<div style="margin-top:22px;">${tagline(textOf(texts, "site.primaryLine"))}</div>`, "0 40px 36px"),
    ].join(""),
    { logoSrc: `${home}/email/southstill-logo.png`, href: home },
  );

  const footer = [
    `<a href="${esc(home)}" style="color:${C.muted};text-decoration:underline;">${esc(site)}</a>${contactLine ? ` · ${esc(contactLine)}` : ""}`,
    `<br>${esc(t("email.footer"))}`,
  ].join("");

  const subject = t("email.subject");
  const html = shell({ title: subject, preheader: t("email.preheader"), body, footer });

  const text = [
    t("email.title"),
    "",
    t("email.intro"),
    "",
    `${t("email.promiseBold")} ${t("email.promise")}`,
    "",
    `${t("email.refLabel")}: ${ref}`,
    "",
    t("email.stepsTitle").toUpperCase(),
    ...how.map((s) => `${s.n}. ${s.title}${s.tag ? ` (${s.tag})` : ""}: ${s.body}${s.note ? ` ${s.note}` : ""}`),
    "",
    t("email.summaryTitle").toUpperCase(),
    plain(items),
    t("email.summaryNote"),
    "",
    `${t("email.replyTitle")} ${t("email.replyNote")}`,
    "",
    t("email.signoff"),
    t("email.signature"),
    "",
    textOf(texts, "site.primaryLine"),
    home,
  ].join("\n");

  return { subject, html, text };
}

/* ------------------------------------------------------------------ owner heads-up */

export function ownerNotificationEmail(d: Inquiry, ref: string, est: Estimate, ctx: EmailContext, leadId?: string): BuiltEmail {
  const first = d.name.trim().split(/\s+/)[0] || d.name;
  const session = ctx.options.find((o) => o.bookingId === d.category)?.label ?? "Something else";
  const home = ctx.siteUrl;
  const items = summary(d, est, ctx, true);
  const replySubject = `Your ${domainOf(home).replace(/^www\./, "")} inquiry (${ref})`;
  const mailto = `mailto:${d.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(`Hi ${first},\n\nThanks so much for reaching out about your session!\n\n`)}`;
  const leadUrl = leadId ? `${home}/admin/leads/${leadId}` : `${home}/admin/leads`;
  const headline = est.kind === "package" ? est.label.replace(/^Estimated /, "") : est.kind === "quote" ? "Custom quote" : "";

  const body = card(
    [
      row(eyebrow(`New inquiry · ${ref}`), "8px 40px 0"),
      row(title(`${d.name} · ${session}`), "0 40px"),
      headline ? row(`<p style="margin:10px 0 0;font-family:'Fraunces',Georgia,serif;font-size:26px;color:${C.clayDeep};">${esc(headline)}</p>`, "0 40px") : "",
      row(`<div>${button(`Reply to ${first}`, mailto)}${button("Open in dashboard", leadUrl, "light")}</div>`, "18px 40px 0"),
      row(`<div style="margin-top:6px;">${details([{ k: "Email", v: d.email, href: `mailto:${d.email}` }, ...items])}</div>`, "20px 40px 0"),
      row(para("Replying to this email goes straight to them. They've already been sent a confirmation with their reference and the next steps.", { size: 13, color: C.muted, margin: "20px 0 0" }), "0 40px 32px"),
    ].join(""),
    { logoSrc: `${home}/email/southstill-logo.png`, href: home },
  );

  const source = [d.utm?.source, d.utm?.medium, d.utm?.campaign].filter(Boolean).join(" / ") || d.referrer || "";
  const footer = source ? `Came from: ${esc(source)}` : "Southstill dashboard";
  const subject = `New inquiry ${ref}: ${session} from ${d.name}`;
  const html = shell({ title: subject, preheader: `${d.name} · ${session}${headline ? ` · ${headline}` : ""}`, body, footer });
  const text = [`New inquiry ${ref}`, `${d.name} <${d.email}>`, plain(items), "", `Open: ${leadUrl}`].join("\n");
  return { subject, html, text };
}
