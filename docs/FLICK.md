# Flick: the lens who lives on the site

Flick is ECHO, recolored for Red Clay & Light. The geometry and motion are ported directly from ECHO's `EchoRing` (the plugin character):

| ECHO (JUCE) | Flick (web) |
|---|---|
| Dark body + ring stroke with a slowly rotating two-color gradient | Ink lens face + terracotta→sand ring (`.flick-ring` rotates via CSS) |
| Round eyes at x = ±0.33r, y = −0.06r, radius 0.15r | Same proportions in SVG (`FlickSVG.tsx`, r = 20) |
| Blink squashes eyes to 0.35× | Same, via the Web Animations API |
| "Happy" swaps eyes for upturned arcs (±0.45π) | Same arc math |
| Eyes follow direction of travel (offset up to 0.16r) | Same, or toward the cursor / a hovered photo |
| Spring physics `acc = (target − pos)·k − vel·d` | `engine.ts`, rAF only while moving |
| Echo trail: expanding, fading copies of the ring | `engine.emit()`, CSS-animated rings in a fixed layer |
| Restrained halo | Radial-gradient halo |

Additions for the web: squash/stretch along velocity, little feet that peek out when walking or dragged, a camera-flash "snap", a lens-cleaning cloth, a tiny map (404 page), sleepy lids, and "z"s.

## Architecture

```
components/flick/
  FlickLoader.tsx   lazy-mounts Flick after load + idle (never competes with LCP/INP)
  FlickRoot.tsx     React shell: renders character, bubble, menu, film strip, guide
  controller.ts     the brain: machine + engine + signals + scheduling + speech + intro
  antics.ts         page performances: tidy, straighten, margin fix, hammer disaster, polish, snap
  machine.ts        pure finite state machine (unit-tested)
  engine.ts         spring physics, transform-only DOM writes, echo trail, blink, hop, clip
  safeSpots.ts      where Flick may sit (samples what's under a spot)
  FlickSVG.tsx      the character (pure SVG)
  lines.ts          voice: ambient lines by page + event reactions
  guide.ts          Ask Flick answers built from site content (no AI)
  FlickGuide.tsx    accessible modal guide
  FilmStrip.tsx     easter egg: triple-click Flick
  prefs.ts          hidden (localStorage) / muted (sessionStorage), read after hydration
  bus.ts            emitFlick() for any component to signal Flick without importing it
  useMediaFlags.ts  reduced-motion, compact (phone/touch), low-power heuristics
```

### States

`rest · notice · blink · wander · peek · inspect · antic · react · help · hide · celebrate · sleep · drag · dismissed`

Each state has a **priority**, a **maximum duration** and a **cooldown** (`machine.ts`). Higher priority interrupts lower. When a behavior ends, Flick returns to rest and that behavior can't recur until its cooldown passes. **Pauses** (typing, menu open, lightbox open, hidden tab) are a set of reasons: every reason must clear before Flick resumes.

### Signals → behavior

| Signal | Reaction |
|---|---|
| Cursor near (desktop) | eyes track; within 150px, *notice*: surprised blink, curious lean |
| Hover a photo | eyes look at it; after ~1.2s, maybe *inspect*: moves beside (never over) it |
| Click a photo | *react*: camera flash, happy eyes, hop, maybe "oh, this one's good." |
| Save a favorite | compliment (once per session guaranteed) |
| Pick a package / story chip | approving hop |
| Booking or story complete | *celebrate*: double hop, echo burst, confetti |
| Form error / long hesitation | *help*: one short, kind line ("a sentence or two is plenty.") |
| Focus any input | tucks away at the screen edge until typing is done |
| Menu / lightbox / dialog open | pause |
| 45s idle | *sleep* (sleepy eyes, "z"), wakes on activity ("i wasn't sleeping. i was exposing slowly.") |
| Scroll | eyes glance in the scroll direction; re-finds a free spot when scrolling stops |
| Every 6–12s at rest | maybe *wander* to another free margin spot, *peek* from behind a photo edge (visual clip only), *hide* off-screen and peek back, or clean the lens |
| Drag (desktop mouse) | spring-follows the cursor with feet out; dropped on the nearest free spot |
| Triple-click | film strip of real portfolio thumbnails |

### The star of the page

- **First visit:** Flick swoops in and introduces himself in a card: who he is, *tap me anytime to ask a question*, *drag me around* (desktop), and *too chatty? tap me → Quiet please, or hide me from the footer*. Buttons: **Ask me something**, **Got it**, **Quiet please**. Shown once per browser (`localStorage rcl:flick:introduced`); replay it from his menu ("Introduce yourself again"). Returning visitors get a "welcome back".
- **Size:** 124px on desktop, 96px on phones (`FLICK_SIZE` in `FlickRoot.tsx`).
- **Home:** always the bottom-right corner, hovering with a gentle float and a breathing shadow, on desktop *and* mobile.
- **Chatty:** something to say about every page on arrival, ambient lines every ~12–20s of active browsing, comments when section headings scroll into view (pricing, FAQ, the photographer…), photo hovers, booking buttons, fast scrolling and reaching the bottom of the page.
- **Antics** (`antics.ts`), Flick's main hobby, every ~6–9s while idle (7–11s on phones):
  - **Tidy:** flies to a card or photo, wipes it with a cloth, sparkles, shine sweep. "missed a spot? no. i never miss a spot."
  - **Straighten:** a heading or card goes slightly crooked; he notices, shoves it level.
  - **Margin fix:** a paragraph drifts off its margin; he pushes it back into alignment. "that margin's off by a pixel. or six."
  - **Hammer disaster:** a "tiny adjustment" with a hammer → crack lines, the card tilts, chips fly; he panics, zips back and forth ("don't look. don't look."), comes back with a wrench, the crack fades, the card springs back. "…fixed. nobody saw that."
  - **Polish:** buffs a booking/portfolio button until it gleams.
  - **Snap:** lines up a photo and takes a picture (a flash over the photo).
  - Plus wanders, peeking from behind photo edges, hide-and-seek off the screen edge, and cleaning his own lens. "Do a trick" in his menu triggers an antic on demand.

### Guardrails (still on)

- Antics are **visual only**: Web Animations on page elements (cancelled afterwards, which restores them exactly) and temporary overlays in Flick's own `pointer-events: none` layer. No content, layout or form control is ever changed. They never target forms, dialogs, the header, nav, the footer or anything marked `data-flick-avoid`.
- Every antic aborts instantly on scroll, typing, menus, dialogs, resize, tab switch or navigation, with its timers cancelled and elements restored.
- While Flick is **flying or performing he can't catch clicks** (his button is `pointer-events: none` until he's resting), so he never intercepts a click meant for the page.
- **Focusing any form field** silences him and tucks him off the screen edge until typing is done. Both booking forms are `data-flick-avoid`.
- Muting stops speech (antics continue silently); hiding removes him until restored from the footer.

### Accessibility & motion

- Flick is a real `<button>` ("Flick, the site helper. Open Flick's menu"). The menu takes focus, Escape closes it and focus returns. Tabbing to a tucked Flick brings him into view.
- Menu: **Ask Flick**, **Quiet please** (mutes speech for the session), **Move to the other side** (keyboard alternative to dragging), **Hide Flick** (until restored from the footer link, which is always present).
- `prefers-reduced-motion`: no wandering, trail, hops, confetti or breathing. Flick appears in place and only changes expression.
- Low-power devices (≤2 cores, ≤2 GB memory, Save-Data, or battery under 20% and not charging): no echo trail.
- Ambient chatter is `aria-hidden`. Helpful/celebration lines are announced politely.

### Ask Flick

A deterministic guide, labeled "a guide, not an AI chatbot". Topic buttons and keyword search over answers assembled **at build time from `src/content`** (pricing, FAQs, service area, process). It never invents prices or availability, and says "I'd rather not guess" with a link to a human when it doesn't know. "Which session fits me?" deep-links to `/book?category=…`.

If you later add an LLM, do it server-side behind a route handler with retrieval scoped to `src/content`, rate limiting, a privacy note, prompt-injection defenses and a fallback to a human. It must never confirm bookings or quote prices that aren't in config.

## Tuning

- Speech frequency: `QUIET_MS`, `MIN_LINE_GAP` and the `nextAmbient` range in `controller.ts`
- Antic frequency and mix: `nextBehavior` and the heartbeat's weighted choice in `controller.ts`; antic timelines in `antics.ts`
- Personality: `lines.ts`
- Behavior mix: the heartbeat's weighted choice in `controller.ts`
- Durations, cooldowns, priorities: `machine.ts` (covered by `tests/unit/machine.test.ts`)
- Size: `FLICK_SIZE` in `FlickRoot.tsx`
