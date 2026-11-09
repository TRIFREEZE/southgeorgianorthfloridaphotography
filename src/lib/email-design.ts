/**
 * Southstill's email look, as plain HTML strings that hold up in Gmail, Apple Mail and
 * Outlook: table layout, inline styles, web fonts with safe fallbacks, a light theme
 * locked in (so dark-mode apps don't invert the ink), and every visitor value escaped.
 */

export const C = {
  parchment: "#F6F2EA",
  gallery: "#FFFCF7",
  ink: "#252723",
  inkSoft: "#33352F",
  muted: "#5D5C55",
  clay: "#A46B55",
  clayDeep: "#8E5A46",
  clayLight: "#D4A28C",
  sand: "#DFD2C0",
  rose: "#E6D3CC",
  line: "#E3D9CA",
} as const;

const SERIF = "'Fraunces',Georgia,'Times New Roman',serif";
const SANS = "'Manrope',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Escapes, keeping the visitor's line breaks. */
export const escLines = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

/** Only real web, mail and phone links ever become clickable. */
export function safeHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href) ? esc(href) : "#";
}

export function shell({ title, preheader, body, footer }: { title: string; preheader: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin:0; padding:0; background:${C.parchment}; -webkit-text-size-adjust:100%; }
  a { color:${C.clayDeep}; }
  @media (max-width:620px) {
    .ss-pad { padding-left:22px !important; padding-right:22px !important; }
    .ss-title { font-size:30px !important; line-height:1.15 !important; }
    .ss-btn { display:block !important; width:100% !important; box-sizing:border-box; text-align:center; }
    .ss-k { display:block !important; width:auto !important; padding-bottom:0 !important; }
    .ss-v { display:block !important; padding-top:2px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.parchment};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:28px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
${body}
<tr><td class="ss-pad" style="padding:26px 36px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">${footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** The cream card everything sits on, with the logo across the top. */
export function card(inner: string, { logoSrc, href }: { logoSrc: string; href: string }) {
  return `<tr><td style="background:${C.gallery};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="ss-pad" style="padding:30px 40px 6px;"><a href="${safeHref(href)}" style="text-decoration:none;"><img src="${safeHref(logoSrc)}" width="180" height="29" alt="Southstill" style="display:block;border:0;width:180px;height:auto;max-width:180px;"></a></td></tr>
<tr><td class="ss-pad" style="padding:0 40px;"><div style="height:1px;line-height:1px;background:${C.line};margin:22px 0 4px;">&nbsp;</div></td></tr>
${inner}
</table>
</td></tr>`;
}

export const row = (html: string, pad = "18px 40px 0") => `<tr><td class="ss-pad" style="padding:${pad};">${html}</td></tr>`;

export const eyebrow = (s: string) => `<p style="margin:0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.clayDeep};">${esc(s)}</p>`;

export const title = (s: string) => `<h1 class="ss-title" style="margin:12px 0 0;font-family:${SERIF};font-weight:400;font-size:36px;line-height:1.12;letter-spacing:-0.01em;color:${C.ink};">${esc(s)}</h1>`;

export const h2 = (s: string) => `<h2 style="margin:0;font-family:${SERIF};font-weight:400;font-size:24px;line-height:1.25;color:${C.ink};">${esc(s)}</h2>`;

export const para = (s: string, { size = 16, color = C.inkSoft, margin = "14px 0 0" }: { size?: number; color?: string; margin?: string } = {}) =>
  `<p style="margin:${margin};font-family:${SANS};font-size:${size}px;line-height:1.65;color:${color};">${escLines(s)}</p>`;

/** A pill button that works everywhere (no images, no VML needed for a rounded look in modern Outlook). */
export function button(label: string, href: string, variant: "dark" | "light" = "dark") {
  const dark = variant === "dark";
  return `<a class="ss-btn" href="${safeHref(href)}" style="display:inline-block;margin:6px 8px 0 0;padding:14px 24px;border-radius:999px;font-family:${SANS};font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;${
    dark ? `background:${C.ink};color:${C.gallery};border:1px solid ${C.ink};` : `background:${C.gallery};color:${C.ink};border:1px solid ${C.sand};`
  }">${esc(label)}</a>`;
}

/** The reference number, set apart so it's easy to find later. */
export function refBox(label: string, ref: string, note: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};border-radius:14px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.muted};">${esc(label)}</p>
<p style="margin:4px 0 0;font-family:${SERIF};font-size:26px;letter-spacing:0.04em;color:${C.ink};">${esc(ref)}</p>
<p style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted};">${esc(note)}</p>
</td></tr></table>`;
}

export type Detail = { k: string; v: string; href?: string; extra?: string };

/** Label / value rows (stacked on phones). Values are escaped; links only if safe. */
export function details(items: Detail[]) {
  const rows = items
    .filter((d) => d.v.trim())
    .map((d, i) => {
      const value = d.href ? `<a href="${safeHref(d.href)}" style="color:${C.clayDeep};text-decoration:underline;">${escLines(d.v)}</a>` : escLines(d.v);
      const border = i === 0 ? "" : `border-top:1px solid ${C.line};`;
      return `<tr>
<td class="ss-k" valign="top" width="150" style="${border}padding:11px 14px 11px 0;font-family:${SANS};font-size:13px;font-weight:700;color:${C.muted};width:150px;">${esc(d.k)}</td>
<td class="ss-v" valign="top" style="${border}padding:11px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink};">${value}${d.extra ? `<br><span style="font-size:13px;color:${C.muted};">${esc(d.extra)}</span>` : ""}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

/** The "How it works" steps, with the current one highlighted. */
export function steps(items: { n: string; title: string; body: string; tag?: string; note?: string }[]) {
  return items
    .map((s, i) => {
      const current = Boolean(s.tag);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:${i === 0 ? 16 : 10}px;${current ? `background:${C.parchment};border-radius:14px;` : ""}">
<tr>
<td valign="top" width="54" style="padding:${current ? "16px 0 16px 16px" : "6px 0"};width:54px;font-family:${SERIF};font-size:24px;line-height:1;color:${current ? C.clayDeep : C.clayLight};">${esc(s.n)}</td>
<td valign="top" style="padding:${current ? "16px 16px 16px 4px" : "6px 0"};">
${current ? `<p style="margin:0 0 6px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${C.clayDeep};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.gallery};">${esc(s.tag!)}</span></p>` : ""}
<p style="margin:0;font-family:${SANS};font-size:16px;font-weight:700;line-height:1.35;color:${C.ink};">${esc(s.title)}</p>
<p style="margin:4px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.6;color:${C.inkSoft};">${esc(s.body)}</p>
${s.note ? `<p style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted};">${esc(s.note)}</p>` : ""}
</td>
</tr></table>`;
    })
    .join("");
}

/** A soft rose callout for the one thing everyone should know. */
export const callout = (strong: string, rest: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.rose};border-radius:14px;"><tr><td style="padding:16px 20px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink};"><strong>${esc(strong)}</strong> ${esc(rest)}</td></tr></table>`;

export const divider = () => `<div style="height:1px;line-height:1px;background:${C.line};margin:30px 0 26px;">&nbsp;</div>`;

export const tagline = (s: string) => `<p style="margin:0;font-family:${SERIF};font-style:italic;font-size:20px;line-height:1.4;color:${C.clayDeep};">${esc(s)}</p>`;
