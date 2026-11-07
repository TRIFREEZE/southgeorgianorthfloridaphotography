/**
 * Central, typed access to environment variables.
 *
 * Public values (NEXT_PUBLIC_*) are inlined at build time and are safe in the browser.
 * Server values are read lazily inside server-only modules — never import
 * `serverEnv` from a Client Component.
 */

const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

function resolveSiteUrl(): string {
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProd = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProd) return `https://${vercelProd}`;
  const vercelUrl = clean(process.env.VERCEL_URL);
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

export const publicEnv = {
  siteUrl: resolveSiteUrl(),
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  contactPhone: clean(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  baseCity: clean(process.env.NEXT_PUBLIC_BASE_CITY),
  instagramUrl: clean(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
  facebookUrl: clean(process.env.NEXT_PUBLIC_FACEBOOK_URL),
  tiktokUrl: clean(process.env.NEXT_PUBLIC_TIKTOK_URL),
  youtubeUrl: clean(process.env.NEXT_PUBLIC_YOUTUBE_URL),
  turnstileSiteKey: clean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  googleSiteVerification: clean(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
} as const;

/** True only on the Vercel production deployment (or a self-host that sets APP_ENV=production). */
export const isProductionDeployment =
  process.env.VERCEL_ENV === "production" ||
  (!process.env.VERCEL_ENV && process.env.APP_ENV === "production");

export const socialLinks: { label: string; href: string }[] = (
  [
    ["Instagram", publicEnv.instagramUrl],
    ["Facebook", publicEnv.facebookUrl],
    ["TikTok", publicEnv.tiktokUrl],
    ["YouTube", publicEnv.youtubeUrl],
  ] as [string, string | undefined][]
).flatMap(([label, href]) => (href ? [{ label, href }] : []));
