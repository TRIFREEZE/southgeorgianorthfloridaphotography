# Owner guide

You can run this site in a few hours a week. **Everything you'll change regularly is in `/admin`**: photos, where they appear, categories, prices, page text, FAQs, testimonials, client galleries and leads. Nothing you do there needs code, GitHub or a redeploy.

## How editing works (the 30-second version)

1. Make changes anywhere in the dashboard. They save as **drafts**. Visitors don't see them yet.
2. The bar at the top always shows what's unpublished. Press **Preview** to see the real site with your changes on a desktop and a phone side by side.
3. Press **Publish**. The live site updates within seconds. Or press **Discard** to throw the drafts away.

## Replacing the sample photos (about 5 minutes for 30 photos)

The site launches with clearly labeled sample placeholders. Here's the fastest way to replace them all:

1. **Name your files descriptively** before uploading (`bay-mare-sunset-thomasville.jpg`). The name becomes the starting title and alt text. Camera names like `IMG_2041` are ignored.
2. **Photo library → choose a category → drop the whole folder** onto the drop zone. Upload as many as you like at once; each file shows its own progress. Repeat for each category.
3. **Site photos** shows every photo spot on the site as a card: the homepage hero, the 13 "selected work" spots, both founders' portraits and up to three extra About-page photos, each category cover, each service page and each journal post. Cards still showing samples are marked **Sample**. **Drag a file from your computer onto any card** to replace it in one step, or press **Library** to choose a photo you've already uploaded.
4. Press **Preview**, check desktop and phone, then **Publish**.

Spots you don't set by hand are **Automatic**: they use your *Featured* photos first, then the first photo in the category. Once a category has any real photo, its samples disappear.

**Homepage "selected work":** you choose exactly which photos appear. Pick up to 13 in Site photos → Homepage (#1 is the biggest and sits in the middle; the next few are the larger ones). Only the photos you pick are shown, in your order, and nothing is added: pick 4 and the cluster is 4 photos; pick 13 and it's all 13. Empty spots are simply left out. **Remove** takes one photo out; **Clear selected work** empties the list. Until you've picked any, your *Featured* photos fill in automatically, and the first photo you pick starts a fresh list. The photos are arranged as a round cluster in different sizes, each shown whole. As visitors scroll down, the photos drift in from the edges and settle into the circle (the motion is handled by the browser itself where supported, so it stays smooth on phones). Phones show the first 9. Service pages use the same cluster for their photos.

## Editing a photo

Click any photo in the library (or **Crop & text** on a Site photos card):

- **Crop for desktop and mobile separately.** Click or drag on the photo to choose what must stay in frame, then switch to the **Mobile** tab and do it again. The previews on the right show the real shapes the site uses (wide banner, tall card, phone card, phone full screen). Use **Zoom** to tighten a crop. *Copy desktop crop* starts mobile from the same point.
- **Alt text** (required to go live): describe what's in the frame ("Bay mare and her rider at sunset in a pecan orchard"). It helps Google Images and people using screen readers.
- **Title, description, location:** optional. Location only if true; it powers local relevance.
- **Category:** where it appears in the portfolio. *None* keeps it as a site-only photo (good for your hero or portrait).
- **Resolution:** the editor warns you if a file is small (under 1800px on its long side) or zoomed in so far it would look soft in big spots like the hero or journal covers. Upload the full-size export for those.
- **Also show in:** tick any other categories this photo belongs to (a dog on a family shoot can be in *People* and *Pets*). It appears in each of those galleries.
- **Visible on the site / Featured:** hide a photo without deleting it, or prefer it for covers and the homepage.
- **Permission:** pick the true status. If clients are recognizable you need their permission (keep the release). A photo marked *Not confirmed yet* can't be published.
- **Replace file…:** swap in a new version (a re-edit, a better frame). The title, alt text, category, placements and order are kept. The old file is deleted after you publish.
- **Delete:** shows everywhere the photo is used first. A photo that has never been published is removed immediately; a live one stays live until you publish, and you can **Restore** it until then. Deleting 5+ photos at once asks you to type DELETE.

**Reordering:** pick a category tab in the library, then drag photos into the order you want (on a phone or tablet, press and hold first). **Bulk actions:** tick photos to move them to a category, **also add them to (or remove them from) another category** while keeping the ones they're in, feature, show/hide, confirm permission or delete them together.

Your originals are always kept untouched in private storage. The site gets an optimized copy (rotated, resized to 2560px, location data removed) and serves fast modern formats at every screen size. iPhone **HEIC** files need exporting as JPEG first (Photos → File → Export, or Settings → Camera → Formats → Most Compatible).

## Categories (each one is a full session type)

**Categories** is where you add a new kind of session, e.g. *Cars, trucks & bikes*. Type the name and press **Add**: it immediately gets its own portfolio gallery, its own service page (`/services/…`), a choice in the session finder on the Book page (and the quick forms and Ask Flick), and a place on the Pricing page. Nothing else to set up; it all stays in sync. After you publish, it's live everywhere.

Open **Service & booking setup** on any category (including the original four) to:

- **Pricing:** choose *Packages (priced by photos)* and tick which packages it offers (none ticked = all), or *Custom quote* and write the intro, what the quote depends on, an optional example estimate and the button wording. Custom-quote categories get a card on the Pricing page.
- **Session finder:** the choice label and hint, the question asked in step 2 ("Who's in the photos?") with an example, and whether to also ask "Who are the animals?".
- **Service page:** its web address, name, menu label, headline, intro, "Great for" list, the how-it-works steps (add or remove steps), time & pace, button and search-engine text. Its questions come from **Pricing & text → FAQs** (tick the service), and its cover photo is in **Site photos**.
- Switch off **Has its own service page** or **Show in the session finder** if a category should only be a portfolio gallery.

You can also rename a category, change its gallery address (`/portfolio/…`), hide it, drag categories into order (the order everywhere: portfolio filters, homepage cards, services, the session finder) and delete one. Deleting a category never deletes photos: photos that were also in another category stay there; the rest move to *No category*.

## Build your story

**Build your story** controls the optional "Picture it first" builder. Add, remove and reorder the buttons for question 1 (who or what) and question 2 (the feel), and the timing choices. Each question-1 button leads to a category (that decides the booking path and which photos show) and can suggest a package. Use **+** under any button to link specific photos to it; they show when a visitor picks it. Buttons keep their internal name when you rename them, so shared story links keep working. The question wording itself is in **Pricing & text → All site text → Build your story**.

## Pricing, page text, FAQs and testimonials

**Pricing & text** has four tabs. Every save is a draft; publish to go live.

- **Pricing:** your packages (add, remove and reorder them; leave the price empty for a quoted one like **Custom**, and leave photos empty when there's no fixed count), what's included, extra-photo price, add-ons, travel, deposit, the "no stopwatch" promise and small print. Custom-quote wording now lives with each category in **Categories**. Tick **These prices are final** when you've confirmed them. The booking estimate always uses these exact numbers.
- **All site text:** every word on the site, listed by page on the left: the header menu and footer, the homepage (including the words that **cycle in the headline**: *Homepage → Hero: words that rotate*, one per line, and the headline's last word joins the cycle; and **how many words at the end of the headline are colored, italic or bold**, three separate number boxes, 0 turns a style off), About, the portfolio, the services list and the wording shared by every service page, pricing, Our approach, booking and thank-you pages, contact, FAQ page headings, the service area, the story builder's questions and every journal article. Each service page's own words are edited with its category in **Categories**. Use the search box to jump straight to a phrase you saw on the site. Each box shows the current wording. Change it and save, or press **Reset** to bring back the original. A few boxes fill themselves in: `{price}` becomes your lowest package price, `{extraPrice}` your extra-photo price, `{service}` the service name.
  - **About page:** a shared headline and intro about the two of you, then a section for each founder with their own name, title and story (Founder 1 and Founder 2). Both portraits are in **Site photos → About page**. The homepage's "Meet the founders" shows both portraits with your names and the shared intro.
  - **Journal articles** are plain text: a blank line between paragraphs, `## ` at the start of a line for a heading, `### ` for a smaller one, `- ` for a bullet and `> ` for a highlighted note.
  - Category names and descriptions (the portfolio filters and homepage story cards) are in **Categories**. Package names, prices and what's included are in the **Pricing** tab. Legal pages (privacy, terms) stay in code on purpose. Have them reviewed rather than edited casually.
- **FAQs:** edit, add, remove and reorder, and choose where each appears (FAQ page, homepage, and any service page). Ask Flick answers from these too.
- **Testimonials:** only real words from real clients, with their permission. One appears on the site only when both *Client gave permission* and *Show on site* are ticked.

## Client galleries

**Client galleries → New client gallery:** give it a title, an optional welcome message, an optional end date, and choose whether full-resolution downloads are allowed. A memorable password is suggested for you. Then drop the client's photos in. Send the **share link** and the **password** separately (for example, link by email and password by text).

Client photos live in their own private storage, never in your portfolio, and never in search results. Images are delivered through links that expire after an hour; changing the password signs out everyone who opened it before. Close a gallery by unticking *Gallery is open*, or delete it (you'll be asked to type its title).

## Storage

**Overview → Storage** shows how much space your website photos, original uploads and client galleries use, against your plan (set `STORAGE_QUOTA_GB` in Vercel; Supabase Pro includes 100 GB).

## A few things still live in files

These rarely change and stay in `src/content/` (edit on GitHub → pencil icon → *Commit changes*; Vercel redeploys in about a minute):

- **`site.ts`:** the towns you really serve (`serviceArea.confirmed: true`) and brand lines.
- **`services.ts`:** the original wording of the first four service pages, used as a starting point. Everything about them is editable in **Categories**.
- **`about.ts`:** set `confirmed: true` once the About text in the dashboard is yours. Only true facts. No invented credentials, years or client counts.
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

## Emails (`/admin/emails`)

The moment someone sends an inquiry, two emails go out (once Resend is set up, see DEPLOYMENT.md step 3):

- **To the client: their confirmation.** In Southstill's colors and type, with the logo. It thanks them by first name, says a real person will reply personally, and makes the promise up front: *this isn't a confirmed booking yet; nothing is reserved or charged until you've agreed on the details together.* It shows their reference number, walks through **How it works** (step 01 marked *Happening now*, the other steps worded exactly as on the site, plus your gallery delivery line), repeats back everything they sent so they can check it, invites them to just hit reply, and ends with links to the portfolio and journal and your tagline.
- **To you: the heads-up.** Their name, session and estimate at the top, a **Reply to …** button (opens an email to them with a greeting started), **Open in dashboard**, every detail they gave, and a tap-to-find link for their Facebook or Instagram name.

**Emails** in the dashboard shows both with a made-up sample client, at computer or phone width, and **Send me a test** sends one to your inbox. The client email's wording is all editable in **Pricing & text → Confirmation email** (use `{first}` for their first name and `{ref}` for the reference); the steps follow your "How it works" text automatically.

## How the booking form guides visitors

The booking form is built so anyone, including older visitors, can finish it without help:

- Each step starts with one plain sentence saying exactly what to do ("Tap the kind of photos you'd like. Then tap Continue.").
- A gently bobbing **"Tap here"** bubble with a pressing finger points at the one next thing to do: the session choices, then **Continue**, then each box to fill in, the agree box and finally **Send my inquiry**. It says "Click" instead of "Tap" for people using a mouse, and stays still for anyone who has reduced motion turned on.
- If something is missing or mistyped, the page glides up to a red box that lists each problem in plain words ("Your email address is missing the “@” sign. It should look like name@example.com.") with a **Take me there to fix it** button for each.
- Email typos like `gmial.com` or `yahoo.con` get a one-tap **"Did you mean …?"** fix.

## Handling leads (`/admin/leads`)

- New inquiries arrive by email (if Resend is set up) and always appear here.
- Every inquiry includes the visitor's **Facebook or Instagram name** (no link needed: "Jane Smith" or "@janesmith"; if someone pastes a link, it's clickable), shown as **Social** on the lead and in the email, so you know who you'll be photographing. Visitors see why you ask, right under the box.
- Use **Reply by email** (pre-filled), then move the **stage**: new → contacted → quoted → accepted/declined → booked → archived.
- **Booked** is your manual confirmation. The site never tells a client they're booked.
- **Notes** are private. **Export CSV** for your records or a spreadsheet.
- **Delete** permanently removes a lead (e.g. for a privacy request).
- Each lead shows its source (UTM/referrer). Share links like `https://yourdomain.com/?utm_source=instagram&utm_medium=bio` to see which channels bring real inquiries.

## Flick

Flick introduces himself on a visitor's first visit, then lives in his corner: occasional chatter, idle animations, and (on desktop) the rare tasteful polish or hammer mishap beside him. Visitors can mute or hide him anytime (his menu, the intro card, or the footer). To tone him down, raise the timing ranges described in docs/FLICK.md → Tuning. If you ever want Flick gone site-wide, remove `<FlickLoader … />` from `src/app/(site)/layout.tsx`. To change what Flick says, edit `src/components/flick/lines.ts`. **Ask Flick** answers from your live content: prices and packages, every category (including new ones), FAQs and both founders' names, so it stays current on its own. Keep it dry, kind and never pushy.

## Experiments

Headlines and package labels live in content files, so A/B-style tests are simple: change a line in a pull request, compare inquiry rates in Vercel Analytics (`submit_inquiry` vs `view_pricing`/`start_booking`), and keep the winner. Judge by qualified inquiries, not clicks on Flick.

## Asset licenses

- Fonts: Fraunces and Manrope, SIL Open Font License 1.1 (self-hosted).
- Logo mark and Flick: original artwork created for this project.
- Photos: only your own, or images you have written permission to use.
