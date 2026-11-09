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

const LOOKS_LIKE_LINK = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;

/**
 * Their Facebook or Instagram name as we'll store it. A plain name ("Jane Smith"),
 * an @username or a pasted link all work; a link is tidied into a full https address.
 */
export function normalizeSocial(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 2 || v.length > 120) return null;
  if (!/\s/.test(v) && LOOKS_LIKE_LINK.test(v) && !/^@/.test(v)) {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if ((u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password) return u.toString();
    } catch {
      /* not a link after all: keep it as typed */
    }
  }
  return /[<>]/.test(v) ? null : v;
}

export function socialProblem(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Please type your Facebook or Instagram name, so we know who we're photographing.";
  if (v.length < 2) return "That's a little short. Please type your name as it shows on Facebook, or your Instagram @name.";
  if (v.length > 120) return "That's a little long. Just your Facebook name or Instagram @name is plenty.";
  return normalizeSocial(v) ? null : "Please type just your Facebook name or Instagram @name (no special symbols like < or >).";
}
