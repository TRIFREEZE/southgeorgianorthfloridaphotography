# Owner guide

You can run this site in a few hours a week. Photos and leads are handled in `/admin`. Words and prices live in small, commented files you can edit on GitHub (pencil icon → edit → *Commit changes*). Vercel redeploys automatically.

## Before launch: replace every placeholder

### Photos (in `/admin/photos`)
1. Upload **12–24 of your strongest original photos** across the four categories (People & Families, Pets & Horses, Weddings & Celebrations, Businesses & Brands).
2. For each photo:
   - **Alt text:** describe what's actually in the frame ("Bay mare and her rider at sunset in a pecan orchard"). Required to publish.
   - **License / permission:** pick the true status. If clients are recognizable, you need their permission (keep the release). Photos can't be published while this is "Not confirmed yet".
   - **Location:** only if true. It powers local relevance, so never guess.
   - **Featured:** shows in the homepage mosaic and category cards.
   - **Homepage hero:** exactly one. Pick something with clear light and room for the eye.
   - **Focal point X/Y %:** keeps faces in frame when the photo is cropped (50/50 = center; 50/20 = keep the top).
3. Upload **one portrait of yourself** with category *About / founder*. It appears on the homepage and `/about`.
4. Once any real photo is published, all sample placeholders disappear automatically.

Files are processed for you: rotated, resized to a 3000px master, stripped of EXIF/GPS location data, and served as fast AVIF/WebP at every size. Give files descriptive names before uploading (`horse-portrait-thomasville.jpg`), since names become part of the image URL.

### Words (in `src/content/`)
- **`pricing.ts`:** confirm every number, then set `status: "confirmed"`. The homepage hero shows "Portrait sessions from $89" only after that. Set `travel.includedRadiusMiles` when you've decided it, and leave `deposit.enabled: false` until your contract and payment process are final.
- **`site.ts`:** confirm the towns you really serve (`serviceArea.confirmed: true`), and set `turnaroundCopy` (e.g. "Galleries are delivered within two weeks.") when you're confident.
- **`about.ts`:** rewrite the story in your own words, add your `name`, set `confirmed: true`. Only true facts. No invented credentials, years or client counts.
- **`reviews.ts`:** add real reviews **with permission** (first name + initial is fine). The section stays hidden until there's at least one.
- **Legal pages** (`src/app/(site)/privacy`, `terms`): they describe exactly what the site does. Have them reviewed for your situation, along with your session contract, before taking payments.

`/admin` shows a live **Launch readiness** list of what's still missing.

## City pages (`src/content/locations.ts`)

Pages for Moultrie, Thomasville, Tallahassee, Valdosta and Monticello exist but are **off**. Turn one on only when you can fill it with genuinely local value:
- photos you actually made there (set their *Location* to that town in `/admin`)
- favorite **permitted** shoot settings with a useful note each
- travel notes and two or three town-specific FAQs
- a real intro (`intro` must be filled in)

Then set `published: true`. Thin, copy-paste city pages hurt rankings and trust, which is why they're off by default.

## Journal (`src/content/journal.ts`)

Three practical guides are included. Add posts by copying one and editing the blocks (`p`, `h2`, `ul`, `note`). Shoot stories should use real sessions you have permission to share. Set `published: false` to hide a draft.

## Handling leads (`/admin/leads`)

- New inquiries arrive by email (if Resend is set up) and always appear here.
- Use **Reply by email** (pre-filled), then move the **stage**: new → contacted → quoted → accepted/declined → booked → archived.
- **Booked** is your manual confirmation. The site never tells a client they're booked.
- **Notes** are private. **Export CSV** for your records or a spreadsheet.
- **Delete** permanently removes a lead (e.g. for a privacy request).
- Each lead shows its source (UTM/referrer). Share links like `https://yourdomain.com/?utm_source=instagram&utm_medium=bio` to see which channels bring real inquiries.

## Flick

Visitors can mute or hide Flick anytime (menu or footer). If you ever want Flick gone site-wide, remove `<FlickLoader … />` from `src/app/(site)/layout.tsx`. To change what Flick says, edit `src/components/flick/lines.ts`. Keep it dry, kind and never pushy.

## Experiments

Headlines and package labels live in content files, so A/B-style tests are simple: change a line in a pull request, compare inquiry rates in Vercel Analytics (`submit_inquiry` vs `view_pricing`/`start_booking`), and keep the winner. Judge by qualified inquiries, not clicks on Flick.

## Asset licenses

- Fonts: Fraunces and Manrope, SIL Open Font License 1.1 (self-hosted).
- Logo mark and Flick: original artwork created for this project.
- Photos: only your own, or images you have written permission to use.
