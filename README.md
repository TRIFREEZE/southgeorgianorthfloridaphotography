# Red Clay & Light Photography

Production website and lightweight booking workflow for **Red Clay & Light Photography** (South Georgia & North Florida), with **Flick**, an ECHO-style animated lens mascot.

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

Without Supabase configured, the dev server stores inquiries **in memory** (logged to the terminal) and shows labeled sample images. Production deployments **refuse** to accept inquiries without Supabase rather than silently dropping them.

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

1. Create a Supabase project and run `supabase/migrations/20261107000000_init.sql` (SQL editor or `supabase db push`).
2. Create your admin user in Supabase → Authentication → Users.
3. Push this repo to GitHub → import it in Vercel → add the environment variables from `.env.example` → Deploy.
4. Add your domain in Vercel → Settings → Domains, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
5. Work through **[docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)** (also shown live at `/admin`).

## Editing content

All business facts live in `src/content/`. Change a file, push, and Vercel redeploys. See **[docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)**.

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

Photos are managed in **`/admin/photos`**, with no code changes. Contact details and socials are **environment variables**.

## Architecture

```
src/
  app/
    (site)/            public pages (home, portfolio, services, pricing, book, …)
    admin/             owner admin: login, leads, photos (server actions)
    api/inquiry/       inquiry endpoint (JSON + no-JS form POST)
    api/cron/prune/    daily housekeeping (Vercel Cron)
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx icon.svg
  components/
    booking/           wizard, quick inquiry, fields, Turnstile, attribution
    flick/             the mascot system (see docs/FLICK.md)
    home/ media/ story/ layout/ ui/ seo/
  content/             editable business content (above)
  lib/
    inquiry/           schema (Zod), estimate (pure), service (server pipeline), store
    supabase/          server clients (service + public)
    photos.ts          cached portfolio reads ('use cache' + tag invalidation)
    admin-auth.ts      Supabase-password + signed HttpOnly session cookie
    env.ts / server-env.ts   public vs server-only configuration
supabase/migrations/   schema, RLS policies, storage buckets
tests/unit, tests/e2e
docs/                  deployment, owner guide, Flick, launch checklist
```

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript strict, Tailwind CSS v4 (CSS design tokens), Zod 4, Supabase (Postgres + Storage + Auth), Resend (HTTP API), Vercel Analytics + Speed Insights, optional Cloudflare Turnstile, Vitest, Playwright + axe. No animation library: Flick and all motion are CSS/WAAPI plus a small spring engine.

### Inquiry pipeline (`src/lib/inquiry/service.ts`)

validate (Zod) → honeypot + minimum fill time → rate limit (hashed IP, 6 per 15 min, in Postgres so it works across serverless instances) → optional Turnstile → duplicate suppression (15 min) → recompute the estimate server-side (never trust the client's price) → **insert** → owner email + client confirmation → record email status. The visitor only sees "received" after the row is stored. Email failure never loses an inquiry: it's visible in `/admin`.

### Security notes

- Secrets are read only in `server-env.ts` (`import "server-only"`), so they can't be bundled for the browser.
- RLS is enabled on every table. Only published photos are publicly readable; inquiries are accessible only to the server.
- Admin: Supabase verifies the password, the email must be in `ADMIN_EMAILS`, and a 12-hour HMAC-signed HttpOnly cookie is issued. Every admin page and server action re-checks it. Login attempts are rate-limited.
- Same-origin check and body-size limit on the inquiry API. CSV export neutralizes spreadsheet formulas. Security headers in `next.config.ts`. `/admin` and `/client-gallery` are `noindex` (not a security boundary; auth is).
- Uploaded originals go to a private bucket via short-lived signed URLs, get processed (metadata stripped), and are deleted. Only derivatives are public.

## Licenses

See [docs/LICENSES.md](docs/LICENSES.md). Fonts are SIL OFL (Fraunces, Manrope), self-hosted. No third-party photography ships with the site; placeholders are generated vector art labeled "Sample".
