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
  controller.ts     the brain: machine + engine + signals + scheduling + speech rules
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

`rest · notice · blink · wander · peek · inspect · react · help · hide · celebrate · sleep · drag · dismissed`

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

### Never in the way

- **Placement samples reality:** `document.elementsFromPoint` checks what's actually under a candidate spot and rejects text, links, buttons, inputs, images, nav, dialogs, forms and anything marked `data-flick-avoid` (both booking forms are). If no free spot exists, Flick tucks mostly off the screen edge.
- **Speech bubbles** only appear where their own rectangle is free. Otherwise the line is skipped.
- Measurements happen only when a decision is made, never per frame. The animation loop runs only while Flick is moving.
- The layer is `pointer-events: none` except the button itself, so it never steals clicks, scrolls or swipes.
- **First 10 seconds:** silent. Ambient lines at most every 35–60s of *active* browsing, a 15s minimum gap between any lines, and no repeats until a pool is exhausted.

### Mobile

Flick stays tucked at the edge (small, eyes peeking) and pops into a free corner only briefly: for a reaction, a celebration or the occasional line. No cursor chase, no wandering, no dragging, no covering controls. Smaller size.

### Accessibility & motion

- Flick is a real `<button>` ("Flick, the site helper. Open Flick's menu"). The menu takes focus, Escape closes it and focus returns. Tabbing to a tucked Flick brings him into view.
- Menu: **Ask Flick**, **Quiet please** (mutes speech for the session), **Move to the other side** (keyboard alternative to dragging), **Hide Flick** (until restored from the footer link, which is always present).
- `prefers-reduced-motion`: no wandering, trail, hops, confetti or breathing. Flick appears in place and only changes expression.
- Low-power devices (≤2 cores, ≤2 GB memory, Save-Data, or battery under 20% and not charging): no trail, no wandering.
- Ambient chatter is `aria-hidden`. Helpful/celebration lines are announced politely.

### Ask Flick

A deterministic guide, labeled "a guide, not an AI chatbot". Topic buttons and keyword search over answers assembled **at build time from `src/content`** (pricing, FAQs, service area, process). It never invents prices or availability, and says "I'd rather not guess" with a link to a human when it doesn't know. "Which session fits me?" deep-links to `/book?category=…`.

If you later add an LLM, do it server-side behind a route handler with retrieval scoped to `src/content`, rate limiting, a privacy note, prompt-injection defenses and a fallback to a human. It must never confirm bookings or quote prices that aren't in config.

## Tuning

- Speech frequency: `QUIET_MS`, `MIN_LINE_GAP` and the `nextAmbient` range in `controller.ts`
- Personality: `lines.ts`
- Behavior mix: the heartbeat's weighted choice in `controller.ts`
- Durations, cooldowns, priorities: `machine.ts` (covered by `tests/unit/machine.test.ts`)
- Size: `FlickRoot.tsx` (`76` desktop / `60` compact)
