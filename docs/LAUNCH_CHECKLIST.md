# Launch checklist

`/admin` shows a live version of the configurable items below.

## Status

| Area | Status | Notes |
|---|---|---|
| All pages, navigation, 404/error states | **Working now** | 25 public routes tested on desktop + mobile; one `h1` each; no horizontal overflow |
| Pricing, estimate, package logic | **Working now** | Edited in `/admin` → Pricing & text; booking estimates use the published numbers |
| Booking wizard + quick inquiry + contact | **Working now** | Server-validated, honeypot, min fill time, rate limit, dedupe, no-JS fallback |
| Inquiry storage | **Needs credentials** | Supabase URL + secret key; production refuses submissions without it (never drops them silently) |
| Owner + client emails | **Needs credentials** | Resend key + verified domain; leads are still saved without it |
| Bot check (Turnstile) | Optional, **needs credentials** | Honeypot + rate limiting run regardless |
| Admin (leads pipeline, CSV) | **Needs credentials** | Supabase + `ADMIN_EMAILS` + `ADMIN_SESSION_SECRET` + a Supabase Auth user |
| Content manager (photos, placements, crops, categories, pricing, text, FAQs, testimonials, preview/publish, storage usage) | **Needs credentials** | Both migrations; tested end to end on a production build with the local backend |
| Uploads + optimization (originals preserved) | **Needs credentials** | Supabase Storage buckets from the migrations |
| Analytics + Speed Insights | **Needs a toggle** | Enable both in the Vercel dashboard (Pro) |
| Daily cleanup cron | **Needs credentials** | `CRON_SECRET`; scheduled by `vercel.json` |
| Flick (intro, idle life, tasteful antics) + Ask Flick + Build Your Story | **Working now** | Fully client-side; Ask Flick uses site content only |
| SEO: metadata, sitemap, robots, JSON-LD, OG image | **Working now** | Set `NEXT_PUBLIC_SITE_URL` to your domain |
| Portfolio photos, hero, founder portrait | **Needs owner data** | Labeled samples show until you publish real photos (`/admin` → Site photos) |
| Prices, travel radius, turnaround, deposit | **Needs owner data** | Draft values from the brief; edit in `/admin` → Pricing & text |
| Founder story | **Needs owner data** | Uses only facts from the brief; replace it in `/admin` → Pricing & text → Page text |
| Contact email/phone, socials, base city | **Needs owner data** | Env vars; hidden while blank |
| Reviews | **Needs owner data** | Hidden while empty; real + consented only (`/admin` → Testimonials) |
| City pages | **Needs owner data** | Off until genuinely local content exists |
| Client galleries | **Needs credentials** | Private bucket, scrypt-hashed passwords, expiring signed links, downloads toggle, noindex |
| Payments, contracts, calendar | **Not built (by design)** | Connect after you choose providers; the site never marks anything "booked" itself |

## Owner inputs before going public

- [ ] Confirm business/trademark name, domain and the exact Google Business Profile name
- [ ] Confirm your service hub (general area) and that you're eligible for a service-area Business Profile; never publish a home address
- [ ] Publish 12–24 original photos across the categories, with alt text and permissions, and replace every **Sample** card in `/admin` → Site photos
- [ ] Set both founders' portraits (Site photos → About page); write both founders' names and stories in the dashboard in your own words, then set `about.ts` → `confirmed: true`
- [ ] Run `supabase/migrations/20261109000000_flexible.sql` in Supabase → SQL Editor (needed for new categories, the Custom package and Build your story)
- [ ] Run `supabase/migrations/20261110000000_social.sql` in Supabase → SQL Editor (gives each lead its own Social field; until then the link is kept at the top of the message)
- [ ] Run `supabase/migrations/20261111000000_bookings.sql` in Supabase → SQL Editor (bookings sent from /admin/emails are saved as leads; until then they're saved with a note instead)
- [ ] Run `supabase/migrations/20261112000000_pipeline.sql` in Supabase → SQL Editor (needed for Coming up dates and the shot / edited / delivered stages)
- [ ] Confirm prices, photo counts, travel radius, deposit/refund, weather/reschedule terms, turnaround, licensing and sales tax (with local professional advice)
- [ ] Set real public email/phone/social links (env vars)
- [ ] Verify the Resend sending domain; send yourself a test inquiry
- [ ] Have the privacy policy, terms and session contract reviewed (minors, animals, commercial usage, events) before taking payment
- [ ] Search Console: verify, submit the sitemap
- [ ] Google Business Profile: real name, accurate category, service area, real photos

## Technical gates (already passing in this build)

- [x] `npm run lint`: 0 problems
- [x] `npm run typecheck`: strict TypeScript, 0 errors
- [x] `npm test`: 64 unit tests, including the whole CMS workflow against the file backend (upload → draft → crop → place → publish → replace → delete → discard, categories as full session types, photos in several categories, pricing validation and the Custom-package upgrade, the story builder, gallery passwords) and Ask Flick matching
- [x] `npm run build`: production build, all public pages prerendered
- [x] `npm run test:e2e`: 40 E2E tests on desktop + mobile against a production build (plus an overflow sweep at 320/360/375/390/414/768/1024px), including axe WCAG 2.2 AA, full wizard submission, no-JS form post, honeypot checks, lightbox keyboard + deep link, Flick behavior, and the **content manager end to end**: owner login, replacing the hero by dropping a file on its spot, preview (Draft Mode) vs. what visitors see, publish without redeploy, bulk upload into a category, independent desktop/mobile crops verified in the browser at both widths, 30 photos in one drop, replace keeps text, safe delete (live until publish), category rename/add, a brand-new custom-quote category showing up on Services, its own page, Pricing and the session finder, page text + pricing edits going live, a private client gallery (wrong/right password, signed downloads, forged links refused) and admin-only access

- [x] Lighthouse (mobile, local production build, sample images): Performance 99, Accessibility 100, SEO 100, Best Practices 96 (the only deduction is Vercel Analytics scripts that exist only on Vercel). LCP 0.9s, CLS 0.

Measure Core Web Vitals on the real domain after launch with Vercel Speed Insights (p75 field data) and PageSpeed Insights, ideally once real photos are uploaded. Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
