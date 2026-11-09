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

function niceDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const domainOf = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** A site page ("/portfolio") or a full address, as an absolute link. */
const absolute = (href: string, home: string) => (/^https?:\/\//i.test(href) ? href : `${home}${href.startsWith("/") ? "" : "/"}${href}`);

/** A link the owner can tap to find someone from a typed name or @username. */
export function socialLookup(social: string, texts: Record<string, string> = {}): { href: string; label: string } | null {
  if (/^https?:\/\//i.test(social)) return { href: social, label: textOf(texts, "ownerEmail.openProfile") };
  const handle = social.match(/^@([a-z0-9._]{1,30})$/i)?.[1];
  if (handle) return { href: `https://www.instagram.com/${handle}/`, label: textOf(texts, "ownerEmail.lookInstagram") };
  return { href: `https://www.facebook.com/search/people/?q=${encodeURIComponent(social)}`, label: textOf(texts, "ownerEmail.searchFacebook") };
}

/** Everything the visitor told us, in plain words, in the order they answered. */
function summary(d: Inquiry, est: Estimate, ctx: EmailContext, forOwner: boolean): Detail[] {
  const texts = ctx.content.texts;
  const L = (k: string, vars?: Record<string, string>) => textOf(texts, `emailLabel.${k}`, vars);
  const { pricing } = ctx.content;
  const session = ctx.options.find((o) => o.bookingId === d.category)?.label ?? textOf(texts, "book.other.label");
  const pkg = pricing.packages.find((p) => p.id === d.packageId);
  const priced = est.kind === "package";
  const addOns = (d.addOns ?? []).map((id) => pricing.addOns.find((a) => a.id === id)?.name ?? id);
  const when =
    d.dateFlexibility === "specific"
      ? niceDate(d.preferredDate)
      : d.dateFlexibility === "range"
        ? [niceDate(d.preferredDate), niceDate(d.preferredDateAlt)].filter(Boolean).join(` ${L("or")} `)
        : L("flexible");
  const story = [d.storySubject, d.storyFeeling].filter(Boolean).join(" · ");
  const look = socialLookup(d.social, texts);
  const inspo = d.inspirationIds?.length ?? 0;
  const list: Detail[] = [
    { k: L("session"), v: session },
    { k: L("photos"), v: pkg ? L("photosValue", { package: pkg.name, count: packagePhotos(pkg), price: packagePrice(pkg) }) : "" },
    { k: L("extra"), v: priced && d.extraPhotos ? `${d.extraPhotos} (${formatPrice(pricing.extraPhoto.priceCents * d.extraPhotos)})` : "" },
    { k: L("addOns"), v: addOns.join(", ") },
    { k: L("estimate"), v: est.kind === "incomplete" ? "" : est.label, extra: forOwner ? undefined : textOf(texts, "email.estimateNote") },
    { k: L("group"), v: d.groupDetails ?? "" },
    { k: L("animals"), v: d.animals ?? "" },
    { k: L("setting"), v: d.locationPreference ?? "" },
    { k: L("where"), v: [d.city, d.zip].filter(Boolean).join(" ") },
    { k: L("when"), v: d.kind === "wizard" ? when : "" },
    { k: L("time"), v: d.preferredTime ? L(`time.${d.preferredTime}`) : "" },
    { k: L("travel"), v: d.travelNotes ?? "" },
    { k: L("planAround"), v: d.specialNeeds ?? "" },
    { k: L("story"), v: story },
    { k: L("social"), v: d.social, href: forOwner ? look?.href : undefined, extra: forOwner && look && !/^https?:/i.test(d.social) ? look.label : undefined },
    { k: L("phone"), v: d.phone ?? "", href: forOwner && d.phone ? `tel:${d.phone.replace(/[^\d+]/g, "")}` : undefined, extra: d.phone ? (d.smsOptIn ? L("textOk") : L("noText")) : undefined },
    { k: forOwner ? L("theirNote") : L("yourNote"), v: d.message ?? "" },
    { k: L("inspiration"), v: inspo ? L("inspirationValue", { count: String(inspo) }) : "" },
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
          `<div style="margin-top:14px;">${t("email.cta1").trim() ? button(t("email.cta1"), absolute(t("email.cta1Link"), home)) : ""}${t("email.cta2").trim() ? button(t("email.cta2"), absolute(t("email.cta2Link"), home), "light") : ""}</div>`,
        "0 40px",
      ),
      row(divider() + para(t("email.signoff"), { margin: "0" }) + para(t("email.signature"), { margin: "2px 0 0", color: C.ink }) + (t("email.tagline").trim() ? `<div style="margin-top:22px;">${tagline(t("email.tagline"))}</div>` : ""), "0 40px 36px"),
    ].join(""),
    { logoSrc: `${home}/email/southstill-logo.png`, href: home, alt: t("email.logoAlt") },
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
    t("email.tagline"),
    home,
  ].join("\n");

  return { subject, html, text };
}

/* ------------------------------------------------------------------ owner heads-up */

export function ownerNotificationEmail(d: Inquiry, ref: string, est: Estimate, ctx: EmailContext, leadId?: string): BuiltEmail {
  const texts = ctx.content.texts;
  const first = d.name.trim().split(/\s+/)[0] || d.name;
  const session = ctx.options.find((o) => o.bookingId === d.category)?.label ?? textOf(texts, "book.other.label");
  const home = ctx.siteUrl;
  const estimateText = est.kind === "package" ? est.label.replace(/^Estimated /, "") : est.kind === "quote" ? textOf(texts, "ownerEmail.quote") : "";
  const source = [d.utm?.source, d.utm?.medium, d.utm?.campaign].filter(Boolean).join(" / ") || d.referrer || "";
  const vars = { name: d.name, first, session, ref, estimate: estimateText, source, site: domainOf(home) };
  const t = (k: string) => textOf(texts, k, vars);
  const items = summary(d, est, ctx, true);
  const mailto = `mailto:${d.email}?subject=${encodeURIComponent(t("ownerEmail.replySubject"))}&body=${encodeURIComponent(t("ownerEmail.replyGreeting").replace(/\\n/g, "\n"))}`;
  const leadUrl = leadId ? `${home}/admin/leads/${leadId}` : `${home}/admin/leads`;

  const body = card(
    [
      row(eyebrow(t("ownerEmail.eyebrow")), "8px 40px 0"),
      row(title(t("ownerEmail.title")), "0 40px"),
      estimateText ? row(`<p style="margin:10px 0 0;font-family:'Fraunces',Georgia,serif;font-size:26px;color:${C.clayDeep};">${esc(estimateText)}</p>`, "0 40px") : "",
      row(`<div>${button(t("ownerEmail.replyButton"), mailto)}${button(t("ownerEmail.dashboardButton"), leadUrl, "light")}</div>`, "18px 40px 0"),
      row(`<div style="margin-top:6px;">${details([{ k: textOf(texts, "emailLabel.email"), v: d.email, href: `mailto:${d.email}` }, ...items])}</div>`, "20px 40px 0"),
      row(para(t("ownerEmail.note"), { size: 13, color: C.muted, margin: "20px 0 0" }), "0 40px 32px"),
    ].join(""),
    { logoSrc: `${home}/email/southstill-logo.png`, href: home, alt: textOf(texts, "email.logoAlt") },
  );

  const footer = esc(source ? t("ownerEmail.source") : t("ownerEmail.noSource"));
  const clean = (s: string) => s.replace(/\s*·\s*$/, "").replace(/^\s*·\s*/, "");
  const subject = clean(t("ownerEmail.subject"));
  const html = shell({ title: subject, preheader: clean(t("ownerEmail.preheader")), body, footer });
  const text = [subject, `${d.name} <${d.email}>`, plain(items), "", `${t("ownerEmail.dashboardButton")}: ${leadUrl}`].join("\n");
  return { subject, html, text };
}
