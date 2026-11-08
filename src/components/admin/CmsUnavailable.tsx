export function CmsUnavailable() {
  return (
    <div className="max-w-2xl rounded-2xl border border-clay/40 bg-[#f3e4dc] p-6">
      <h1 className="text-display-sm">Connect Supabase to manage the site</h1>
      <p className="mt-3 text-ink-soft">
        The dashboard stores photos in Supabase Storage and content in Supabase Postgres. Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel, run both
        migrations, then redeploy once. See <code>docs/DEPLOYMENT.md</code>.
      </p>
    </div>
  );
}
