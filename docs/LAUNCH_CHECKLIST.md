# Launch checklist

`/admin` shows a live version of the configurable items below.

## Status

| Area | Status | Notes |
|---|---|---|
| All pages, navigation, 404/error states | **Working now** | 25 public routes tested on desktop + mobile; one `h1` each; no horizontal overflow |
| Pricing, estimate, package logic | **Working now** | All from `src/content/pricing.ts`; custom-quote states for weddings/business |
| Booking wizard + quick inquiry + contact | **Working now** | Server-validated, honeypot, min fill time, rate limit, dedupe, no-JS fallback |
| Inquiry storage | **Needs credentials** | Supabase URL + secret key; production refuses submissions without it (never drops them silently) |
| Owner + client emails | **Needs credentials** | Resend key + verified domain; leads are still saved without it |
| Bot check (Turnstile) | Optional, **needs credentials** | Honeypot + rate limiting run regardless |
| Admin (leads pipeline, CSV, photos) | **Needs credentials** | Supabase + `ADMIN_EMAILS` + `ADMIN_SESSION_SECRET` + a Supabase Auth user |
| Portfolio uploads + optimization | **Needs credentials** | Supabase Storage buckets from the migration |
| Analytics + Speed Insights | **Needs a toggle** | Enable both in the Vercel dashboard (Pro) |
| Daily cleanup cron | **Needs credentials** | `CRON_SECRET`; scheduled by `vercel.json` |
| Flick (intro, idle life, tasteful antics) + Ask Flick + Build Your Story | **Working now** | Fully client-side; Ask Flick uses site content only |
| SEO: metadata, sitemap, robots, JSON-LD, OG image | **Working now** | Set `NEXT_PUBLIC_SITE_URL` to your domain |
| Portfolio photos, hero, founder portrait | **Needs owner data** | Labeled samples show until you publish real photos |
| Prices, travel radius, turnaround, deposit | **Needs owner data** | Draft values from the brief |
| Founder story | **Needs owner data** | Uses only facts from the brief; replace with your own |
| Contact email/phone, socials, base city | **Needs owner data** | Env vars; hidden while blank |
| Reviews | **Needs owner data** | Hidden while empty; real + consented only |
| City pages | **Needs owner data** | Off until genuinely local content exists |
| Client galleries | **Planned integration** | `/client-gallery` explains gallery links honestly; it doesn't fake a secure portal |
| Payments, contracts, calendar | **Not built (by design)** | Connect after you choose providers; the site never marks anything "booked" itself |

## Owner inputs before going public

- [ ] Confirm business/trademark name, domain and the exact Google Business Profile name
- [ ] Confirm your service hub (general area) and that you're eligible for a service-area Business Profile; never publish a home address
- [ ] Publish 12–24 original photos across the four categories, with alt text and permissions
- [ ] Upload a founder portrait; rewrite `about.ts` in your own words
- [ ] Confirm prices, photo counts, travel radius, deposit/refund, weather/reschedule terms, turnaround, licensing and sales tax (with local professional advice)
- [ ] Set real public email/phone/social links (env vars)
- [ ] Verify the Resend sending domain; send yourself a test inquiry
- [ ] Have the privacy policy, terms and session contract reviewed (minors, animals, commercial usage, events) before taking payment
- [ ] Search Console: verify, submit the sitemap
- [ ] Google Business Profile: real name, accurate category, service area, real photos

## Technical gates (already passing in this build)

- [x] `npm run lint`: 0 problems
- [x] `npm run typecheck`: strict TypeScript, 0 errors
- [x] `npm test`: 32 unit tests
- [x] `npm run build`: production build, all public pages prerendered
- [x] `npm run test:e2e`: 29 E2E tests on desktop + mobile (plus an overflow sweep at 320/360/375/390/414/768/1024px), including axe WCAG 2.2 AA (no serious/critical issues on key pages), full wizard submission, no-JS form post, honeypot/CSRF checks, lightbox keyboard + deep link, and Flick behavior (first-visit intro, size/visibility in the corner, stays on his side (still on phones), menu, hide/restore, tricks leave the page untouched, typing tuck, reduced motion)

- [x] Lighthouse (mobile, local production build, sample images): Performance 99, Accessibility 100, SEO 100, Best Practices 96 (the only deduction is Vercel Analytics scripts that exist only on Vercel). LCP 0.9s, CLS 0.

Measure Core Web Vitals on the real domain after launch with Vercel Speed Insights (p75 field data) and PageSpeed Insights, ideally once real photos are uploaded. Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
