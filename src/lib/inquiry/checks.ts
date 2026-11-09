/**
 * Plain-language checks shared by the browser and the server, so a visitor sees
 * the same clear explanation whichever one catches the problem.
 */

const EXAMPLE = "It should look like name@example.com.";

/** Why an email address can't be right, in words anyone can act on, or null if it looks fine. */
export function emailProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Please type your email address, so we can reply to you.";
  if (/\s/.test(v)) return `Your email address has a space in it. Email addresses never have spaces. ${EXAMPLE}`;
  if (v.length > 200) return "That email address is too long. Please check it.";
  const at = v.split("@").length - 1;
  if (at === 0) return `Your email address is missing the “@” sign. ${EXAMPLE}`;
  if (at > 1) return `Your email address has more than one “@” sign. ${EXAMPLE}`;
  const [local, domain] = v.split("@");
  if (!local) return `Your email address is missing the part before the “@”. ${EXAMPLE}`;
  if (!domain) return `Your email address is missing the part after the “@” (like gmail.com). ${EXAMPLE}`;
  if (/,/.test(domain)) return "Your email address has a comma where a dot should be (for example gmail.com, not gmail,com).";
  if (!domain.includes(".")) return `Your email address is missing its ending, like “.com” (for example ${local}@${domain}.com).`;
  if (/\.\.|^\.|\.$/.test(domain) || /\.\.|^\.|\.$/.test(local)) return `Your email address has a dot in the wrong place. ${EXAMPLE}`;
  const tld = domain.split(".").pop() ?? "";
  if (!/^[a-z]{2,}$/i.test(tld)) return `The ending of your email address (“.${tld}”) doesn't look right. It's usually “.com”, “.net” or “.org”.`;
  if (!/^[^\s@<>()[\]\\,;:"]+$/.test(local) || !/^[a-z0-9.-]+$/i.test(domain)) return `Your email address has a character that isn't allowed. ${EXAMPLE}`;
  return null;
}

const COMMON = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "msn.com", "comcast.net", "att.net", "bellsouth.net", "windstream.net", "me.com", "mac.com", "protonmail.com"];
const FIXES: Record<string, string> = { con: "com", cpm: "com", vom: "com", xom: "com", comm: "com", om: "com", ner: "net", nte: "net", ogr: "org" };

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * A likely typo in a common email provider ("gmial.com", "yahoo.con"), as the corrected
 * address, or null. Only a suggestion: the visitor can keep what they typed.
 */
export function emailSuggestion(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (emailProblem(v)) return null;
  const [local, domain] = v.split("@");
  if (COMMON.includes(domain)) return null;
  const parts = domain.split(".");
  const tld = parts.pop()!;
  const fixedDomain = [...parts, FIXES[tld] ?? tld].join(".");
  if (COMMON.includes(fixedDomain)) return `${local}@${fixedDomain}`;
  let best: string | null = null;
  let bestD = 3;
  for (const c of COMMON) {
    const dist = distance(fixedDomain, c);
    if (dist < bestD && dist <= (c.length > 8 ? 2 : 1)) {
      best = c;
      bestD = dist;
    }
  }
  return best ? `${local}@${best}` : null;
}

/* ------------------------------------------------------------------ social link */

export const SOCIAL_WHY =
  "Why we ask: we just like to know who we're photographing before we meet. We only use it to put a face to your name for this inquiry.";

/** The social profile as we'll store it: a full link, or an @username. Null if it's not usable. */
export function normalizeSocial(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (/^@[a-z0-9._-]{2,40}$/i.test(v)) return v;
  if (/\s/.test(v)) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v.replace(/^\/+/, "")}`;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
    if (u.username || u.password) return null;
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

export function socialProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Please add a link to your Facebook, Instagram or other social media page, or your @username.";
  if (v.length > 300) return "That link is too long. Please paste just the link to your profile.";
  if (/^@/.test(v) && !normalizeSocial(v)) return "That @username doesn't look right. Usernames have no spaces, like @janesmith.";
  if (/\s/.test(v) && !/^@/.test(v))
    return "That doesn't look like a link. Please paste the link to your profile (like facebook.com/janesmith), or type your @username.";
  return normalizeSocial(v) ? null : "That doesn't look like a link. Please paste the link to your profile (like facebook.com/janesmith), or type your @username.";
}
