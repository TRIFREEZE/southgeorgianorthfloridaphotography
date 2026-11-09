/**
 * Emails the owner writes and sends from the dashboard, in the same look as the
 * inquiry confirmation:
 * - Booking confirmed: their own note, the date up top, the details, and "How it works"
 *   with 01–02 done and 03 (Relax & shoot) marked "Coming soon".
 * - Gallery ready: the link as a big button, and the password set apart.
 * Every fixed word comes from Pricing & text, so it's all editable.
 */
import { formatPrice, packagePhotos, packagePrice } from "@/content/pricing";
import { editedExperience, textOf } from "@/lib/cms/texts";
import { bullets, button, C, card, details, divider, esc, eyebrow, h2, noteBlock, para, refBox, row, shell, steps, tagline, title, type Detail } from "@/lib/email-design";
import type { BuiltEmail, EmailContext } from "./emails";
import { domainOf, niceDate } from "./emails";
import type { BookingInput, GalleryDeliveryInput } from "./compose";
import { estimate } from "./estimate";

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

function closing(texts: Record<string, string>, signoffKey: string, vars: Record<string, string>) {
  const t = (k: string) => textOf(texts, k, vars);
  return divider() + para(t(signoffKey), { margin: "0" }) + para(t("email.signature"), { margin: "2px 0 0", color: C.ink }) + (t("email.tagline").trim() ? `<div style="margin-top:22px;">${tagline(t("email.tagline"))}</div>` : "");
}

function footerHtml(ctx: EmailContext, line: string) {
  const site = domainOf(ctx.siteUrl);
  const contact = [ctx.contactEmail, ctx.contactPhone].filter(Boolean).join(" · ");
  return `<a href="${esc(ctx.siteUrl)}" style="color:${C.muted};text-decoration:underline;">${esc(site)}</a>${contact ? ` · ${esc(contact)}` : ""}<br>${esc(line)}`;
}

/* ------------------------------------------------------------------ booking confirmed */

export function bookingConfirmedEmail(b: BookingInput, ctx: EmailContext): BuiltEmail {
  const texts = ctx.content.texts;
  const { pricing } = ctx.content;
  const session = ctx.options.find((o) => o.bookingId === b.category)?.label ?? textOf(texts, "book.other.label");
  const date = niceDate(b.date);
  const vars = { first: firstOf(b.name), name: b.name, session, date, time: b.time, at: b.time ? `, ${b.time}` : "", site: domainOf(ctx.siteUrl) };
  const t = (k: string) => textOf(texts, k, vars);
  const L = (k: string, v?: Record<string, string>) => textOf(texts, `emailLabel.${k}`, v);

  const pkg = pricing.packages.find((p) => p.id === b.packageId);
  const est = estimate({ category: b.category, packageId: b.packageId || null, extraPhotos: b.extraPhotos, addOns: b.addOns }, pricing, ctx.options);
  const addOns = b.addOns.map((id) => pricing.addOns.find((a) => a.id === id)?.name ?? id);
  const price = b.price || (est.kind === "package" ? formatPrice(est.totalCents) : "");

  const items: Detail[] = [
    { k: L("session"), v: session },
    { k: L("photos"), v: pkg ? L("photosValue", { package: pkg.name, count: packagePhotos(pkg), price: packagePrice(pkg) }) : "" },
    { k: L("extra"), v: est.kind === "package" && b.extraPhotos ? `${b.extraPhotos} (${formatPrice(pricing.extraPhoto.priceCents * b.extraPhotos)})` : "" },
    { k: L("addOns"), v: addOns.join(", ") },
    { k: t("bookedEmail.priceLabel"), v: price },
    { k: t("bookedEmail.timeLabel"), v: b.time },
    { k: t("bookedEmail.placeLabel"), v: [b.place, b.city].filter(Boolean).join("\n") },
    { k: L("group"), v: b.groupDetails },
    { k: L("animals"), v: b.animals },
    { k: L("planAround"), v: b.specialNeeds },
  ].filter((x) => x.v.trim());

  // How it works: 01 and 02 are behind us, 03 (Relax & shoot) is next.
  const exp = editedExperience(texts).steps;
  const how = exp.map((s, i) => ({
    n: s.n,
    title: s.title,
    body: i === 2 ? s.body : s.short,
    tag: i === 2 ? t("bookedEmail.nowTag") : undefined,
    note: i === 2 ? t("bookedEmail.nowNote") : undefined,
    done: i < 2 ? t("bookedEmail.doneTag") : undefined,
  }));
  const prep = t("bookedEmail.prep").split(/\r?\n/).map((x) => x.replace(/^[-•*]\s*/, ""));

  const body = card(
    [
      row(eyebrow(t("bookedEmail.eyebrow")), "8px 40px 0"),
      row(title(t("bookedEmail.title")), "0 40px"),
      row(para(t("bookedEmail.intro"), { size: 17 })),
      b.note.trim() ? row(noteBlock(b.note), "20px 40px 0") : "",
      row(refBox(t("bookedEmail.whenLabel"), date, [b.time, b.place || b.city].filter(Boolean).join(" · "), { size: 24, spacing: "0" }), "22px 40px 0"),
      row(divider() + h2(t("bookedEmail.detailsTitle")) + `<div style="margin-top:10px;">${details(items)}</div>`, "0 40px"),
      row(divider() + h2(t("bookedEmail.stepsTitle")) + steps(how), "0 40px"),
      prep.some((x) => x.trim()) ? row(divider() + h2(t("bookedEmail.prepTitle")) + `<div style="margin-top:6px;">${bullets(prep)}</div>` + (t("bookedEmail.weather").trim() ? para(t("bookedEmail.weather"), { size: 14, color: C.muted, margin: "14px 0 0" }) : ""), "0 40px") : "",
      row(divider() + h2(t("bookedEmail.changeTitle")) + para(t("bookedEmail.change")), "0 40px"),
      row(closing(texts, "bookedEmail.signoff", vars), "0 40px 36px"),
    ].join(""),
    { logoSrc: `${ctx.siteUrl}/email/southstill-logo.png`, href: ctx.siteUrl, alt: textOf(texts, "email.logoAlt") },
  );

  const subject = t("bookedEmail.subject");
  const html = shell({ title: subject, preheader: t("bookedEmail.preheader"), body, footer: footerHtml(ctx, t("bookedEmail.footer")) });
  const text = [
    t("bookedEmail.title"),
    "",
    t("bookedEmail.intro"),
    b.note.trim() ? `\n${b.note.trim()}\n` : "",
    `${t("bookedEmail.whenLabel")}: ${date}${b.time ? `, ${b.time}` : ""}`,
    "",
    ...items.map((x) => `${x.k}: ${x.v.replace(/\n/g, ", ")}`),
    "",
    t("bookedEmail.stepsTitle").toUpperCase(),
    ...how.map((s) => `${s.n}. ${s.title}${s.done ? ` (${s.done})` : ""}${s.tag ? ` (${s.tag})` : ""}: ${s.body}${s.note ? ` ${s.note}` : ""}`),
    "",
    ...(prep.some((x) => x.trim()) ? [t("bookedEmail.prepTitle").toUpperCase(), ...prep.filter((x) => x.trim()).map((x) => `- ${x}`), t("bookedEmail.weather"), ""] : []),
    `${t("bookedEmail.changeTitle")} ${t("bookedEmail.change")}`,
    "",
    t("bookedEmail.signoff"),
    textOf(texts, "email.signature"),
  ]
    .filter((x) => x !== undefined)
    .join("\n");
  return { subject, html, text };
}

/* ------------------------------------------------------------------ gallery ready */

export function galleryDeliveryEmail(g: GalleryDeliveryInput, ctx: EmailContext): BuiltEmail {
  const texts = ctx.content.texts;
  const vars = { first: firstOf(g.name), name: g.name, date: niceDate(g.expires), site: domainOf(ctx.siteUrl) };
  const t = (k: string) => textOf(texts, k, vars);

  const body = card(
    [
      row(eyebrow(t("galleryEmail.eyebrow")), "8px 40px 0"),
      row(title(t("galleryEmail.title")), "0 40px"),
      row(para(t("galleryEmail.intro"), { size: 17 })),
      g.note.trim() ? row(noteBlock(g.note), "20px 40px 0") : "",
      row(`<div style="margin-top:6px;">${button(t("galleryEmail.button"), g.link)}</div>`, "20px 40px 0"),
      row(refBox(t("galleryEmail.passwordLabel"), g.password, t("galleryEmail.passwordNote"), { size: 22, spacing: "0.04em", mono: true }), "18px 40px 0"),
      g.expires ? row(para(t("galleryEmail.expires"), { size: 15, color: C.inkSoft }), "4px 40px 0") : "",
      row(divider() + h2(t("galleryEmail.howTitle")) + para(t("galleryEmail.how")), "0 40px"),
      row(
        para(t("galleryEmail.linkFallback"), { size: 13, color: C.muted, margin: "22px 0 0" }) +
          `<p style="margin:4px 0 0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${/^https?:\/\//i.test(g.link) ? esc(g.link) : "#"}" style="color:${C.clayDeep};">${esc(g.link)}</a></p>`,
        "0 40px",
      ),
      row(closing(texts, "galleryEmail.signoff", vars), "0 40px 36px"),
    ].join(""),
    { logoSrc: `${ctx.siteUrl}/email/southstill-logo.png`, href: ctx.siteUrl, alt: textOf(texts, "email.logoAlt") },
  );

  const subject = t("galleryEmail.subject");
  const html = shell({ title: subject, preheader: t("galleryEmail.preheader"), body, footer: footerHtml(ctx, t("galleryEmail.footer")) });
  const text = [
    t("galleryEmail.title"),
    "",
    t("galleryEmail.intro"),
    g.note.trim() ? `\n${g.note.trim()}\n` : "",
    `${t("galleryEmail.button")}: ${g.link}`,
    `${t("galleryEmail.passwordLabel")}: ${g.password}`,
    t("galleryEmail.passwordNote"),
    g.expires ? t("galleryEmail.expires") : "",
    "",
    t("galleryEmail.how"),
    "",
    t("galleryEmail.signoff"),
    textOf(texts, "email.signature"),
  ].join("\n");
  return { subject, html, text };
}
