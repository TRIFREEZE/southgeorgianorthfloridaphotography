# Southstill Photography

Production website and lightweight booking workflow for **Southstill** (South Georgia & North Florida), with **Flick**, an ECHO-style animated lens mascot.

> *Your moments. Our time. No rush.*

Built for **Vercel Pro** with GitHub continuous deployment and **Supabase** for inquiries, the owner admin and portfolio storage.

- **Live estimate booking wizard** and a quick inquiry form, validated server-side, spam-protected, stored in Postgres, emailed to the owner, confirmed to the client.
- **Owner admin** (`/admin`): leads pipeline (stages, notes, CSV export, delete) and portfolio photo uploads (auto-rotate, EXIF/GPS stripping, AVIF/WebP delivery).
- **Flick**: ECHO's ring, eyes, spring physics and echo trail, rebuilt in SVG for the web. He introduces himself, lives in his corner with idle animations and occasional chatter, and now and then polishes (or very carefully breaks, then fixes) something beside him. He tucks away while visitors type, never catches clicks mid-flight, and respects reduced motion.
- **Honest by design**: labeled sample placeholders until real photos are published, no fake reviews or ratings, city pages that stay unpublished until they have real local content, and every price coming from one config file.

---

## Quick start (local)

Requires Node 20.9+ (Node 22 recommended).

```bash
npm install
cp .env.example .env.local      # fill in what you have; everything is optional locally
npm run dev                     # http://localhost:3000
```

Without Supabase configured, the dev server stores inquiries **in memory** (logged to the terminal) and the content manager keeps photos and content in a local `./.data` folder (git-ignored), so you can try the whole dashboard offline: set `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET` (32+ chars) and a local-only `ADMIN_DEV_PASSWORD` in `.env.local`, then open `/admin`. None of that local machinery can run on Vercel: production deployments **refuse** to work without Supabase rather than silently dropping data.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript + React Compiler rules) |
| `npm run typecheck` | Route type generation + `tsc --noEmit` (strict) |
| `npm test` | Vitest unit tests (pricing estimate, validation, Flick state machine, guide, content guards) |
| `npm run test:e2e` | Playwright E2E + axe accessibility tests against a production build (run `npm run build` first) |
| `npm run check` | lint → typecheck → unit tests → build |

E2E needs a Chromium: `npx playwright install chromium`, or point `PLAYWRIGHT_CHROME_PATH` at an installed Chrome.

## Deploying

The full guide is in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. In short:

1. Create a Supabase project and run both files in `supabase/migrations/` in order (SQL editor or `supabase db push`).
2. Create your admin user in Supabase → Authentication → Users.
3. Push this repo to GitHub → import it in Vercel → add the environment variables from `.env.example` → Deploy.
4. Add your domain in Vercel → Settings → Domains, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
5. Work through **[docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)** (also shown live at `/admin`).

## Editing content

**Day to day, everything is edited in `/admin`, with no code, commits or redeploys:**

| Dashboard page | What you manage |
|---|---|
| **Site photos** | Every photo position: homepage hero, the 7 "selected work" tiles, both founders' portraits and extra About photos, each category cover, each service page cover, each journal cover. Drag a file onto a card to replace it. |
| **Photo library** | Bulk drag-and-drop upload with progress, categories, drag-to-reorder, featured, show/hide, delete with safeguards, and the photo editor (independent desktop and mobile focal point + zoom with live crop previews, title, alt text, description, location, permission). |
| **Categories** | Create, rename, change web address, reorder, hide, delete (photos are never deleted with a category). |
| **Pricing & text** | Packages, add-ons, custom quotes, travel, deposit, policies; **all site text** (~300 fields by page, searchable: menus, footer, every page section, service names and pages, the story builder, journal articles); FAQs (and where each appears); testimonials (shown only with permission). |
| **Client galleries** | Private password-protected galleries with expiry, downloads on/off and signed, expiring links. |
| **Preview / Publish** | All edits are drafts. Preview shows the site on a desktop and a phone side by side; Publish makes everything live at once; Discard rolls back. |

See **[docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)**. The files in `src/content/` hold the **original defaults** (used until something is saved in the dashboard) plus structure that rarely changes:

| File | Controls |
|---|---|
| `pricing.ts` | Packages, photo counts, extra-photo price, add-ons, travel, deposit, no-stopwatch wording |
| `site.ts` | Brand lines, service-area towns, turnaround, nav |
| `services.ts` | The four service pages, categories, booking categories |
| `faqs.ts` | FAQ answers (also used by Ask Flick) |
| `about.ts` | Founder story (true facts only) |
| `reviews.ts` | Real, consented reviews (section hidden while empty) |
| `locations.ts` | City pages (off until they have genuine local content) |
| `journal.ts` | Journal posts |
| `story.ts` | "Build Your Story" options and tips |

Contact details and socials are **environment variables**.

## Architecture

```
src/
  app/
    (site)/            public pages (home, portfolio, services, pricing, book, …)
    admin/             dashboard: site photos, library, categories, pricing & text,
                       client galleries, preview, leads (server actions in cms-actions.ts)
    client-gallery/    private, password-protected client galleries (noindex)
    api/inquiry/       inquiry endpoint (JSON + no-JS form POST)
    api/preview/       Draft Mode on/off for previewing unpublished edits (admin only)
    api/dev-storage/   local stand-in for Supabase Storage (404 on Vercel)
    api/cron/prune/    daily housekeeping (Vercel Cron)
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx icon.svg
  components/
    booking/           wizard, quick inquiry, fields, Turnstile, attribution
    admin/             dashboard UI: uploader, focal/crop editor, sortable grids, slot board
    flick/             the mascot system (see docs/FLICK.md)
    home/ media/ story/ layout/ ui/ seo/
  content/             editable business content (above)
  lib/
    inquiry/           schema (Zod), estimate (pure), service (server pipeline), store
    supabase/          server clients (service + public)
    cms/               the content manager
      schema.ts          Zod schemas for photos, placements, categories, pricing, text, FAQs, testimonials
      data.ts            getSiteData(): cached published content ('use cache' + tags), drafts in Draft Mode
      resolve.ts         which photo goes where (explicit choice → featured → first → labeled sample)
      ops.ts             upload/replace/crop/reorder/delete/publish/discard, drafts only until publish
      images.ts          sharp: rotate, sRGB, 2560px master, strip EXIF/GPS, blur placeholder
      galleries.ts       client galleries: scrypt passwords, password-bound access cookies
      repo/              CmsRepo interface → SupabaseRepo (production) / LocalRepo (dev & tests)
    admin-auth.ts      Supabase-password + signed HttpOnly session cookie
    env.ts / server-env.ts   public vs server-only configuration
supabase/migrations/   schema, RLS policies, storage buckets (run both, in order)
tests/unit, tests/e2e
docs/                  deployment, owner guide, Flick, launch checklist
```

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript strict, Tailwind CSS v4 (CSS design tokens), Zod 4, Supabase (Postgres + Storage + Auth), Resend (HTTP API), Vercel Analytics + Speed Insights, optional Cloudflare Turnstile, Vitest, Playwright + axe. No animation library: Flick and all motion are CSS/WAAPI plus a small spring engine.

### Inquiry pipeline (`src/lib/inquiry/service.ts`)

validate (Zod) → honeypot + minimum fill time → rate limit (hashed IP, 6 per 15 min, in Postgres so it works across serverless instances) → optional Turnstile → duplicate suppression (15 min) → recompute the estimate server-side (never trust the client's price) → **insert** → owner email + client confirmation → record email status. The visitor only sees "received" after the row is stored. Email failure never loses an inquiry: it's visible in `/admin`.

### Content manager (`src/lib/cms/`)

- **Drafts → preview → publish.** Every edit writes a *draft* (`media.draft`, `site_content.draft`). Visitors only ever see the *live* copy. **Preview** turns on Next.js Draft Mode (admin-only route handler) so the real pages render drafts; **Publish** copies every draft to live in one step, deletes photos marked for deletion and any replaced files, then calls `updateTag()` so the live Vercel site updates in seconds without a deploy. **Discard** rolls drafts back.
- **Uploads** go straight from the browser to private Supabase Storage via short-lived signed upload URLs (no serverless body-size limit, real progress bars, 3 in parallel). The server then makes a 2560px sRGB JPEG master with EXIF/GPS stripped and a blur placeholder, keeps the **untouched original** in `portfolio-uploads/originals/`, and Vercel's image optimizer serves responsive AVIF/WebP at every size from the master.
- **Crops:** each photo stores a desktop and a mobile focal point and zoom; `PhotoFill` applies them with CSS variables and a `md:` breakpoint, so the right crop is chosen by the browser with no extra requests.
- **Placements** (`site_content.layout`) name the photo for every slot on the site. An empty slot falls back to a featured photo, then any photo, then a clearly labeled sample, so the site never breaks or shows an empty frame.
- **Client galleries** live in a separate private bucket. Passwords are hashed with scrypt; access is an HMAC cookie bound to the current password (changing it signs everyone out); every image and download is a signed URL that expires in an hour; pages are `noindex`; attempts are rate-limited.
- **Local development** uses `LocalRepo` (JSON + files in `./.data`) behind the same interface, so the whole workflow is testable offline. It is hard-disabled on Vercel.

### Security notes

- Secrets are read only in `server-env.ts` (`import "server-only"`), so they can't be bundled for the browser.
- RLS is enabled on every table. Only published photos are publicly readable; inquiries are accessible only to the server.
- Admin: Supabase verifies the password, the email must be in `ADMIN_EMAILS`, and a 12-hour HMAC-signed HttpOnly cookie is issued. Every admin page and server action re-checks it. Login attempts are rate-limited.
- Same-origin check and body-size limit on the inquiry API. CSV export neutralizes spreadsheet formulas. Security headers in `next.config.ts`. `/admin` and `/client-gallery` are `noindex` (not a security boundary; auth is).
- Uploaded originals go to a private bucket via short-lived signed URLs, get processed (metadata stripped), and are deleted. Only derivatives are public.

## Licenses

See [docs/LICENSES.md](docs/LICENSES.md). Fonts are SIL OFL (Fraunces, Manrope), self-hosted. No third-party photography ships with the site; placeholders are generated vector art labeled "Sample".
