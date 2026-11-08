# Flick: the lens who lives on the site

Flick is ECHO, recolored for Southstill. The geometry and motion are ported directly from ECHO's `EchoRing` (the plugin character):

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

Additions for the web: squash/stretch along velocity, little feet that peek out when walking or dragged, a camera-flash "snap", a lens-cleaning cloth (a soft white rag with folds, a dangling corner and a frayed hem), a tiny map (404 page), sleepy lids, and "z"s.

## Architecture

```
components/flick/
  FlickLoader.tsx   lazy-mounts Flick after load + idle (never competes with LCP/INP)
  FlickRoot.tsx     React shell: renders character, bubble, menu, film strip, guide
  controller.ts     the brain: machine + engine + signals + scheduling + speech + intro
  antics.ts         tasteful page performances beside his side: polish, break-and-fix
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
| Cursor near (desktop) | eyes track; within 150px, *notice*: surprised blink |
| Hover a photo | eyes look at it |
| Click a photo | *react*: camera flash, happy eyes, hop, maybe "oh, this one's good." |
| Save a favorite | compliment (once per session guaranteed) |
| Pick a package / story chip | approving hop |
| Booking or story complete | *celebrate*: double hop, echo burst, confetti |
| Form error / long hesitation | *help*: one short, kind line ("a sentence or two is plenty.") |
| Focus a text field | goes quiet and moves to a spot on his side that's clear of the field (always fully visible). Radio buttons and checkboxes don't count |
| Menu / lightbox / dialog open | pause |
| 45s idle | *sleep* (sleepy eyes, "z"), wakes on activity ("i wasn't sleeping. i was exposing slowly.") |
| Scroll | eyes glance in the scroll direction; re-finds a free spot when scrolling stops |
| Every 10–18s at rest | drift somewhere new in his third of the screen along a gentle curve (desktop: anywhere in that third, only over empty space, never over text, photos, buttons or fields; phones: up/down his side), clean his lens, glance around, or hop |
| Drag (desktop mouse) | spring-follows the cursor with feet out; wherever he's dropped becomes his corner |
| Triple-click | film strip of real portfolio thumbnails |

### Personality

- **First visit:** Flick rises into his corner and introduces himself in a card: who he is, *tap me anytime to ask a question*, *drag me around* (desktop), and *too chatty? tap me → Quiet please, or hide me from the footer*. Buttons: **Ask me something**, **Got it**, **Quiet please**. Shown once per browser (`localStorage rcl:flick:introduced`); replay it from his menu ("Introduce yourself again"). Returning visitors get a "welcome back".
- **Size:** 124px on desktop, 96px on phones (`FLICK_SIZE` in `FlickRoot.tsx`).
- **He stays in his corner.** Bottom-right by default, hovering with a gentle float and a breathing shadow. He never crosses the screen on his own:
  - **Desktop:** now and then he floats up or down *his own side* of the page, then drifts home.
  - **Phones:** he stays put in the corner: float, blink, look around, clean his lens, sleep.
  - **Dragging** (desktop mouse) moves his corner to wherever you drop him; he then lives on that side.
- **Chats now and then:** a line roughly every 40–70s of active browsing (at least 18s apart), plus reactions to what you do (clicking or saving photos, finishing a booking, a form error). Section commentary and hover remarks are occasional.
- **Antics** (`antics.ts`): rare (every ~1–2 minutes), desktop only, and only with things right beside his side of the page. He floats up or down to reach them:
  - **Polish:** buffs a nearby card, photo or button with his cloth: a soft shine sweep and a few sparkles.
  - **Break:** a careful tap with a hammer → a small hairline crack and a barely-there tilt, a quiet "oops.", out comes the wrench, crack fades, the card eases back. "fixed. nobody saw that."
  - "Do a trick" in his menu plays one of **five tricks** in rotation (`tricks.ts`): a backflip, "say cheese" (flash + a tiny instant photo prints out), juggling lens caps, a barrel roll and an aperture zoom-out/zoom-in. They play in place, so they work in his phone corner too, and clean up every element they add.
- **Speech bubbles:** small, soft rose with a tail (deliberately unlike any button), spring in, words arrive one by one, float gently, then shrink away. Never clickable.

### Guardrails (still on)

- Antics are **visual only**: Web Animations on page elements (cancelled afterwards, which restores them exactly) and temporary overlays in Flick's own `pointer-events: none` layer. No content, layout or form control is ever changed. They never target forms, dialogs, the header, nav, the footer or anything marked `data-flick-avoid`.
- Every antic aborts instantly on scroll, typing, menus, dialogs, resize, tab switch or navigation, with its timers cancelled and elements restored.
- Flick is **always clickable**, even mid-flight or mid-antic: a click stops him where he is and opens his menu (mid-trick, a click just gets a blink). Wandering pauses while his menu is open.
- Hops and tricks animate a dedicated wrapper (`[data-flick-anim]`) that sits outside the element carrying the CSS hover bob, so the two never fight and nothing snaps when a hop starts or ends.
- **Focusing a text field** silences him and moves him clear of it, still fully on screen. Both booking forms are `data-flick-avoid`.
- **Popups never open under the header or off screen:** before the menu, intro card or film strip opens he checks there's room; if not, he glides to the bottom of his side first.
- **Phone toolbars:** his box is anchored to the bottom of the viewport, so when the browser toolbar slides in and out while scrolling he rides along with the edge instead of jumping.
- Muting stops speech (antics continue silently); hiding removes him until restored from the footer.

### Accessibility & motion

- Flick is a real `<button>` ("Flick, the site helper. Open Flick's menu"). The menu takes focus, Escape closes it and focus returns. Tabbing to Flick brings him into view if he's near an edge.
- Menu: **Ask Flick**, **Quiet please** (mutes speech for the session), **Move to the other side** (keyboard alternative to dragging), **Hide Flick** (until restored from the footer link, which is always present).
- `prefers-reduced-motion`: no wandering, trail, hops, confetti or breathing. Flick appears in place and only changes expression.
- Low-power devices (≤2 cores, ≤2 GB memory, Save-Data, or battery under 20% and not charging): no echo trail.
- Ambient chatter is `aria-hidden`. Helpful/celebration lines are announced politely.

### Ask Flick

A deterministic guide, labeled "a guide, not an AI chatbot", in a chat layout: your question as a bubble, a short typing indicator, then Flick's answer with links and "you might also ask" follow-ups. Answers are assembled from the **published CMS content** (`guide-data.ts`): packages and prices (including quoted ones like Custom), every category with its own answer (new categories included), FAQs, founders' names, service area and process. Matching handles plurals, phrases and small typos and adds everyday synonyms (e.g. "mare" → pets & horses, "motorcycle" → a cars/trucks/bikes category). When two answers are close it asks "did you mean…?" instead of guessing; when nothing matches it says "I'd rather not guess" with a link to a human. "Which session fits me?" lists every bookable category with its pricing and deep-links to `/book?category=…`.

If you later add an LLM, do it server-side behind a route handler with retrieval scoped to `src/content`, rate limiting, a privacy note, prompt-injection defenses and a fallback to a human. It must never confirm bookings or quote prices that aren't in config.

## Tuning

- Speech frequency: `QUIET_MS`, `MIN_LINE_GAP` and the `nextAmbient` range in `controller.ts`
- Antic frequency: `nextAntic` in `controller.ts`; idle mix: `nextBehavior` and the heartbeat's weighted choice; antic timelines in `antics.ts`
- Personality: `lines.ts`
- Behavior mix: the heartbeat's weighted choice in `controller.ts`
- Durations, cooldowns, priorities: `machine.ts` (covered by `tests/unit/machine.test.ts`)
- Size: `FLICK_SIZE` in `FlickRoot.tsx`
