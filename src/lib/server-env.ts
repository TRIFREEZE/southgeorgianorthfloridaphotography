import "server-only";

/** Server-only environment. Importing this from a Client Component fails the build. */
const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

export function serverEnv() {
  return {
    supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? clean(process.env.SUPABASE_URL),
    supabaseAnonKey:
      clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
      clean(process.env.SUPABASE_ANON_KEY),
    supabaseServiceKey: clean(process.env.SUPABASE_SECRET_KEY) ?? clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    resendApiKey: clean(process.env.RESEND_API_KEY),
    emailFrom: clean(process.env.EMAIL_FROM),
    ownerNotificationEmail: clean(process.env.OWNER_NOTIFICATION_EMAIL),
    turnstileSecret: clean(process.env.TURNSTILE_SECRET_KEY),
    ipHashSalt: clean(process.env.IP_HASH_SALT),
    adminEmails: (clean(process.env.ADMIN_EMAILS) ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    adminSessionSecret: clean(process.env.ADMIN_SESSION_SECRET),
  };
}
