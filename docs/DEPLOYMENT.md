# Deployment guide: GitHub → Vercel Pro + Supabase

Follow these steps once. After that, every push to `main` deploys automatically, and every pull request gets its own preview URL. Previews are never indexed by search engines.

Time needed: about 45 minutes, most of it waiting for DNS.

---

## 1. Supabase (database, photo storage, admin login)

1. Create a project at [supabase.com](https://supabase.com). Pick a region close to Vercel's default (**East US / us-east-1** pairs well with Vercel's `iad1`). Save the database password somewhere safe.
2. **Run both migrations, in order.** Choose one:
   - **SQL editor (simplest):** Supabase → SQL Editor → New query → paste the whole of `supabase/migrations/20261107000000_init.sql` → Run. Then a new query with the whole of `supabase/migrations/20261108000000_cms.sql` → Run. Both are safe to run again.
   - **CLI:** `npx supabase login`, `npx supabase link --project-ref YOUR-REF`, then `npx supabase db push` (runs both).

   The first creates the inquiry tables (`inquiries`, `inquiry_events`, `submission_events`) and the `portfolio` (public, optimized photos) and `portfolio-uploads` (private originals) storage buckets. The second adds the content manager: `media` (every photo with its draft and live versions), `site_content` (placements, categories, pricing, page text, FAQs, testimonials), `client_galleries` + `client_gallery_photos`, the private `client-galleries` bucket, and a `storage_usage()` function for the dashboard. Everything has Row Level Security on with **no public access**: only the server (secret key) reads or writes, and visitors only ever receive published content and optimized images.
3. **Check it worked:** Table Editor shows `inquiries`, `inquiry_events`, `submission_events`, `media`, `site_content`, `client_galleries`, `client_gallery_photos` (each with RLS enabled). Storage shows `portfolio`, `portfolio-uploads` and `client-galleries`.
4. **Create your admin login:** Authentication → Users → *Add user* → *Create new user* → your email + a strong password → tick *Auto Confirm User*. Use the same email in `ADMIN_EMAILS` (step 4).
5. **Copy your keys:** Project Settings → API Keys.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (or legacy `anon`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret key (or legacy `service_role`) → `SUPABASE_SECRET_KEY` (**server only**, never share it)

> If you use Vercel's Supabase Marketplace integration instead, it adds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically. The app accepts those names too. You still need to run the migration.

## 2. Resend (email notifications)

1. Create an account at [resend.com](https://resend.com) → Domains → add your domain → add the DNS records it shows (SPF/DKIM) at your DNS provider → wait for *Verified*.
2. API Keys → create a key with *Sending access* → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on that verified domain, e.g. `Red Clay & Light <hello@yourdomain.com>`, and `OWNER_NOTIFICATION_EMAIL` to the inbox that should receive new inquiries.

Without Resend the site still works: inquiries are stored and visible in `/admin`, but nobody gets emailed. `/admin` flags this.

## 3. (Optional) Cloudflare Turnstile

Honeypot, a minimum fill time and database-backed rate limiting are always on. For extra protection: Cloudflare dashboard → Turnstile → Add site → your domain (plus `*.vercel.app` if you want it on previews) → copy the **Site key** to `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **Secret key** to `TURNSTILE_SECRET_KEY`. Set both or neither.

> With Turnstile enabled, the no-JavaScript fallback form can't pass the check (Turnstile needs JS). Visitors without JS can still use the email link on the site.

## 4. GitHub → Vercel

1. Push this folder to a new GitHub repository (private is fine):
   ```bash
   git remote add origin https://github.com/YOUR-USER/red-clay-and-light.git
   git push -u origin main
   ```
2. Vercel → *Add New…* → *Project* → import the repository. Vercel detects **Next.js** automatically. Leave the build command, output directory and root directory at their defaults.
3. Before clicking Deploy, open **Environment Variables** and add everything from `.env.example`. Apply them to **Production** and **Preview**:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | yes | Your final domain, e.g. `https://www.redclayandlight.com` (use the `.vercel.app` URL until your domain is connected) |
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | publishable/anon key |
   | `SUPABASE_SECRET_KEY` | yes | secret/service_role key, **Production + Preview only, never "Development" on shared machines** |
   | `ADMIN_EMAILS` | yes | comma-separated |
   | `ADMIN_SESSION_SECRET` | yes | `openssl rand -base64 48` |
   | `IP_HASH_SALT` | yes | `openssl rand -hex 32` |
   | `CRON_SECRET` | yes | `openssl rand -hex 32` (Vercel sends it to the cron route) |
   | `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` | recommended | |
   | `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE` | recommended | shown publicly; blank = hidden |
   | `NEXT_PUBLIC_BASE_CITY` | optional | general area only |
   | `NEXT_PUBLIC_INSTAGRAM_URL` etc. | optional | real profiles only (also used in structured data) |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional | |
   | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional | Search Console HTML-tag value |

   Don't set `ALLOW_MEMORY_STORE` on Vercel. It's ignored there anyway.
4. Click **Deploy**. The build type-checks the project and prerenders every public page.
5. In the project: **Analytics** → Enable (Web Analytics, cookieless; custom funnel events need Pro, which you have) and **Speed Insights** → Enable. The site already includes both components.

`NEXT_PUBLIC_*` values are baked in at build time. After changing one, redeploy (Deployments → ⋯ → Redeploy).

## 5. Connect your domain

1. Vercel → Project → Settings → **Domains** → add `yourdomain.com` and `www.yourdomain.com`. Choose which one is primary; Vercel redirects the other.
2. Add the DNS records Vercel shows at your registrar. Typically an `A` record for the apex pointing to Vercel's IP and a `CNAME` for `www` pointing to Vercel's DNS target. Use the exact values Vercel displays.
3. Wait for *Valid Configuration* (minutes to a few hours). HTTPS certificates are automatic.
4. Set `NEXT_PUBLIC_SITE_URL` to the primary domain (with `https://`, no trailing slash) and **redeploy**, so canonical URLs, the sitemap and social cards use it.

## 6. Verify the live site (10 minutes)

- [ ] `https://yourdomain.com` loads; `/robots.txt` allows crawling and lists the sitemap (previews show `Disallow: /`).
- [ ] Submit the **quick inquiry** on `/contact` with your own email → you land on the thank-you page with a reference like `RCL-AB12CD` → the owner email arrives → the client confirmation arrives → the row appears in Supabase → Table Editor → `inquiries`.
- [ ] Run the **session finder** on `/book` end to end.
- [ ] `/admin` → log in → the lead is listed → change its stage → add a note → export CSV.
- [ ] `/admin/site-photos` → drag a photo onto the **Hero** card → *Preview* (check desktop and phone) → *Publish* → reload the homepage in a private window: the new hero is live, with no redeploy.
- [ ] `/admin/library` → drop 3–4 photos with a category chosen → click one → set a desktop and a mobile crop → *Save* → *Publish* → they appear on `/portfolio/<category>` (that category's samples disappear).
- [ ] `/admin/galleries` → create a test gallery → add a photo → open the share link in a private window → the password unlocks it and downloads work → delete the test gallery.
- [ ] `/admin` → **Storage** shows usage for all three buckets.
- [ ] Vercel → Settings → Cron Jobs shows `/api/cron/prune` scheduled daily.

## 7. Search & local visibility

- **Search Console:** add a *Domain* property (DNS verification) or a URL-prefix property using `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Submit `https://yourdomain.com/sitemap.xml`. Check the *Pages* and image indexing reports after a few weeks.
- **Google Business Profile:** use the real business name exactly. Set it up as a **service-area business** (hide the address if you work from home), list the towns you actually serve, choose an accurate primary category (e.g. *Photographer*), and add real photos and services. Never create profiles for towns where you have no real location. Ask happy clients for reviews without offering incentives, and keep name/phone/website identical everywhere.
- **Structured data:** the site emits `ProfessionalService`/`LocalBusiness` (no street address), `Service`, `BreadcrumbList`, `FAQPage` (on `/faq`) and `BlogPosting`. Validate with Google's Rich Results Test. Enhanced results are never guaranteed.

## 8. Ongoing

- **Photos, pricing, page text, FAQs, testimonials, categories, client galleries:** all in `/admin`. Edits are drafts until you press **Publish**; then the live site updates within seconds (cache tags are invalidated). No commits or redeploys.
- **Code-level content** (service page structure, journal posts, city pages, legal pages) still lives in `src/content/` and deploys on commit.
- **Leads:** `/admin/leads`. Marking a lead **Booked** is always your manual decision; the site never confirms bookings on its own.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Form says "temporarily unavailable" | Supabase env vars missing or wrong in this environment (Production vs Preview). Check `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY`, then redeploy. |
| Inquiry saved but no email | Check Resend domain status, `EMAIL_FROM` uses the verified domain, and Vercel → Logs for `[inquiry] … owner notification failed`. |
| `/admin` says "not set up" | It names the missing variable. `ADMIN_SESSION_SECRET` must be 32+ chars. |
| Can't log in to admin | The email must exist in Supabase Auth (confirmed) **and** be in `ADMIN_EMAILS`. After 8 failed attempts, wait 15 minutes. |
| Dashboard says "Connect Supabase to manage the site" | The Supabase variables are missing in this environment. Add them and redeploy once. |
| Upload fails with "Upload failed (4xx)" | The storage buckets or the second migration are missing. Re-run `20261108000000_cms.sql`. Files must be JPEG/PNG/WebP/AVIF/TIFF under 100 MB. iPhone HEIC files need exporting as JPEG first. |
| *Publish* is greyed out | The bar names the reason: a visible photo needs alt text, or its permission is still "Not confirmed yet". |
| Published change doesn't appear | Hard-refresh or use a private window (you may still be in Preview; use *Exit preview*). Pages refresh on Publish and within an hour at most. |
| Storage shows "Empty" for everything | `storage_usage()` is missing: re-run the CMS migration. |
| Images from a custom Supabase domain don't load | `next.config.ts` reads the Supabase host at build time. Redeploy after changing `NEXT_PUBLIC_SUPABASE_URL`. |
| Preview deployments show up in Google | They shouldn't: `robots.txt` and meta robots block everything except `VERCEL_ENV=production`. |
