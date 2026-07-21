# GoNai Motion Pack v0.7 — Design/QA/Debug 10 Rounds
Date: 2026-07-21 · Tester: Claude (Playwright headless probes + DOM/computed-style assertions +
eyeball every screenshot) · Theme under test: Forest on White (v0.6) + motion pack v0.7 (15 new
animations)

## Scope
QA the 15 just-landed motion pack animations on top of the existing (already-EN, already-QA'd)
GoNai app: confetti, gn-bump, gn-ripple-once, gn-boing, fly-to-plan (WAAPI), heart burst, landing
stickers (gn-bob/gn-cloud/gn-floaty), .o-marker draw-in, marquee ticker, gn-drift, gn-page,
gn-line-grow + staggered gn-pop, gn-slide-l/r, Odo odometer — plus regression on the pre-existing
system (rise/press/lift/sheet/toast/pulse-ring/count-up). journey.mjs (13-step E2E, English
selectors) must stay green throughout. No copy changes, no layout restructuring, no new
dependencies.

## Method note
Screenshots alone are not evidence of a bug — a mid-animation frame (odometer mid-roll, entrance
opacity, chip hover-transition) looks "wrong" but may be correct. Every finding below is backed by
a DOM/computed-style/`getAnimations()` probe of the **settled** state, not just a screenshot, before
being logged as a real bug or dismissed as a false alarm.

## Rounds

### R1 — Full journey + console errors ✓ green on first try
- `journey.mjs` 13/13, zero console/page errors, on the very first run (no hot-reload flake this
  session). `npx tsc --noEmit` clean.

### R2 — Motion correctness probes ✓ no bugs
- **Confetti fires only on user-pressed End trip**: 0 bits before End trip · 28 bits (matches the
  `COLORS`×length in `components/Confetti.tsx`) right after the click · self-unmounts to 0 within
  3s (component's own 2800ms timer) · **reloading an already-done plan URL** → 0 confetti bits ·
  **soft-navigating away and back to a done plan** → 0 confetti bits. `celebrate` is plain
  `useState(false)`, only flipped inside the "End trip ✓" `onClick` in
  `app/app/plan/[id]/page.tsx:557-567` — never derived from `plan.status`, so a fresh mount of a
  `status: "done"` plan can never trigger it. Confirmed correct by design.
- **Ripple fires once per check-in**: `.gn-ripple-once` count = 1 right after check-in, stays 1 at
  +1s settle (not multiplying). Re-tested on a **second** stop's check-in in the same session —
  `getAnimations()[0].currentTime` resets to a fresh low value (8.3ms, then 8.2ms) each time,
  confirming true replay via `lastCheckin === s.seq` conditional class, not a stale one-shot.
- **Bump replays on each spend**: `.gn-bump` (`key={plan.spent}`) `getAnimations()[0].currentTime`
  resets to ~0 on spend #1 and again on spend #2 (tight 20ms-poll probe), confirming the
  `key`-remount replay pattern works across multiple spends, not just the first.

### R3 — fly-to-plan ghost ✓ no bugs (1 false alarm dismissed)
- Clicked **+ Add to plan**, captured the WAAPI ghost mid-flight (~200ms into the 650ms
  animation), confirmed it removes itself (`ghost.animate(...).onfinish = () => ghost.remove()`)
  with **0 orphan fixed/z-index:150 divs** in the DOM at both ~800ms and ~1.2s post-click.
- **False alarm dismissed**: an initial coordinate check appeared to show the ghost landing ~355px
  away from the budget target vertically. Root cause: Playwright auto-scrolls the page to bring a
  below-the-fold "+ Add to plan" button into view before clicking, and I had measured the target's
  position *before* that scroll. Re-instrumented by monkey-patching `Element.prototype.animate` to
  capture the **actual** keyframes `app/app/planner-client.tsx:192-213` computed at click time, and
  compared against a **fresh** (post-scroll) read of `#gn-budget-target`'s `getBoundingClientRect()`
  — the ghost's implied landing center (`1084, -26.5`) matched the target's fresh center
  (`1084, -26.5`) **exactly** (0.0px diff on both axes). The `flyToBudget` math is correct; my first
  probe's measurement was stale, not the app.

### R4 — Odo correctness ✓ no bugs
- Checked in + spent a custom ฿347 on top of the ฿47 already counted from route legs → expected
  total 394. `Odo`'s `aria-label` read `"394"` and the three `.gn-odo-col` transforms
  (`components/Odo.tsx`) decoded to digits 3/9/4 (`translateY(-192px)/-64=3`, `-576/64=9`,
  `-256/64=4`, 64px = 1em at the 64px DoneSummary size) — DOM state matches the math exactly, on
  both the small tracker Odo and the large `text-[64px]` DoneSummary Odo.
- **3–4 digit alignment/clipping**: at the 3-digit value, the three `.gn-odo-col` boxes are exactly
  contiguous (`436.59→450.21→463.84→477.46`, each 13.625px wide) with `overflow: hidden` on each
  column — no gaps, no overlap, no partial-digit bleed.
- Note (out of scope, not motion): the "Family day" mood tile (`intent=family&indoor=1`) returns 0
  venues from the fixtures API — a pre-existing data-coverage gap, not a motion regression. Not
  fixed (fixtures/filters are outside the motion-pack QA charter); switched the Odo probe to the
  "Work" mood tile instead.

### R5 — Landing visual ✓ 2 real bugs found + fixed, 1 false alarm dismissed
- **Bug 1 (real, fixed)**: the two content-bearing `.gn-floaty` badges ("Fare confirmed",
  "Lat Phrao → Siam") visually overlapped the hero headline ("know every baht before you leave") at
  both 1280px and 1024px viewport widths — confirmed by screenshot, not just bounding-box math (the
  badge card visibly sat on top of the "k" of "know" / the "you" glyphs). Root cause: the badges
  were positioned at `left-[6%]`/`right-[5%]` of the full-width sticker wrapper, while the hero text
  sits in a centered `max-w-4xl` (896px) container — at narrower widths the two margins converge.
  **Fix**: `app/page.tsx:32` and `app/page.tsx:36` — tightened the offsets to `left-[1%]`/`right-[1%]`
  (push the badges closer to the true screen edge, away from the centered text column).
- **Bug 2 (real, fixed)**: even after the offset fix, 1024px specifically (the exact Tailwind `lg`
  breakpoint where the sticker wrapper first turns on) is geometrically too narrow — the 3-word
  heading line spans nearly edge-to-edge at that width, leaving no room for a ~160px card without
  a few px of unavoidable overlap. **Fix**: `app/page.tsx:32,36` — raised just these two
  content-bearing badges from `flex` (visible at `lg`, inherited from the wrapper) to
  `hidden … xl:flex` (visible only from 1280px up), while leaving the simpler emoji-only stickers
  (clouds/tuk-tuk/boat) and the third, lower badge ("One unseen gem") at the original `lg` threshold
  since they never collided with text at any tested width. Re-verified 0 overlaps at 1280/1440/1024
  after both fixes; 430px mobile still hides the whole sticker layer (`hidden lg:block` wrapper,
  unaffected by this change) — re-confirmed in R8.
- **False alarm dismissed**: a cloud emoji (`right-[10%] top-[22%]`) still flags
  `overlapsHeroText: true` in the bounding-box probe at 1024px. Visual check of the screenshot shows
  clear whitespace between the cloud glyph and any heading text — the `<h1>`'s bounding rect spans
  its full centered container (multi-line block element) even where the actual glyphs don't reach,
  so the bounding-box intersection is a geometry artifact, not a visible collision. Left as-is.
- **Marquee seamless loop**: 2 duplicate groups, pixel-identical widths (1522.48px each,
  `.gn-marquee` total 3044.97px = exactly 2×), `translateX(-50%)` moves exactly one full group width
  before the 28s `linear infinite` cycle repeats — mathematically guaranteed seamless (content of
  both groups is identical, confirmed via `textContent` equality).
- **Marker draw-in**: `.o-marker` `background-size` settles to `100% <full-height>` for all 3
  instances on the landing page after the 0.7s animation + 0.45s delay (1.15s) elapses — confirmed
  complete, not stuck.

### R6 — Trip view (timeline + slide direction) ✓ no bugs (1 false alarm dismissed)
- **Slide direction**: default mount of an active plan (arrives "mid-trip") → `gn-slide-r`.
  Clicking **🗓 Plan + route** (Trip→Plan) → `gn-slide-l` (enters from left). Clicking
  **🧭 On the trip** (Plan→Trip) → `gn-slide-r` (enters from right). Matches spec both directions.
- **Staggered pops**: route-leg `.gn-pop` dots carry `animationDelay` `0ms, 90ms, 180ms` in DOM
  order — correct stagger.
- **False alarm dismissed**: an initial check of `.gn-line-grow`'s computed `transform` immediately
  after page-settle read `matrix(1,0,0,0,0,0)` (scaleY **0** — i.e. apparently never grown). This
  was simply caught before the animation finished: `.gn-line-grow` runs
  `0.8s ease 0.15s both` (950ms total) per `app/globals.css:552-553`, and the probe checked within
  ~50ms of mount. Re-checked at +1.2s: `transform: matrix(1,0,0,1,0,0)` (scaleY **1**, full height)
  on all 3 connector lines, and `getAnimations()[0]` reports `{playState: "finished",
  currentTime: 950}` — exactly the declared duration. Confirmed correct; the first read was a
  genuine mid-animation frame, not a stuck animation.

### R7 — Reduced motion ✓ no bugs
- Full 13-step journey re-run with `reducedMotion: "reduce"` context option — 13/13 green, 0
  console errors.
- `.o-marker` under reduced motion: `animation-name: none`, `background-size` already
  `100% 6.46px` (fully drawn, static) — matches the `@media (prefers-reduced-motion: reduce)` block
  in `app/globals.css:573-605`.
- Confetti: `Confetti.tsx`'s own `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
  guard (`components/Confetti.tsx:10-11,32`) returns `null` before render — 0 confetti bits both
  immediately before and immediately after pressing "End trip ✓".

### R8 — Mobile 430px ✓ 1 real bug found + fixed
- Sticker wrapper `display: none` at 430px (`hidden lg:block`, confirmed via computed style) — no
  sticker collage renders below `lg`, so the R5 fixes have zero effect on mobile.
- Mood tiles lay out 2×2 as expected (`{16,71},{221,71},{16,209},{221,209}`, two equal-width
  columns).
- All motion-adjacent controls (mood tile, + Add to plan, Start the trip, Check in, As estimated,
  End trip) tappable and functional at 430px; ripple and fly-to-plan both still fire correctly.
- landing / planner / trip / trip-after-spend: `document.documentElement.scrollWidth === clientWidth`
  (430) throughout — no horizontal scroll.
- **Bug (real, fixed)**: the **done** screen showed `scrollWidth` growing up to 485px (55px of
  horizontal overflow) for the ~2.8s the confetti animation was active, self-correcting the instant
  the bits unmounted. Root cause: `components/Confetti.tsx`'s bit generator picked `left` up to 99%
  and `dx` (translate) up to +59px independently, so a bit anchored near the right edge with a
  positive `dx` renders past `100vw`; Chromium counts protruding `position: fixed` descendants
  toward `document.documentElement.scrollWidth` when nothing clips them. This is a viewport-width-
  independent bug (confirmed the same formula also pushes bits ~46-55px past the edge on a 1280px
  desktop viewport, just less noticeable there) — not a mobile-only issue, so fixed at the source
  rather than papered over with a global `overflow-x: hidden`. **Fix**: `components/Confetti.tsx:20-21`
  — narrowed the randomization envelope from `left ∈ [0,99]% / dx ∈ [-60,59]px` to
  `left ∈ [8,90]% / dx ∈ [-24,23]px`, which keeps every bit within the viewport down to ~320px
  width while preserving visual spread/variety (28 bits still land at distinct positions). Re-ran
  the done-screen overflow probe across 6 timestamps through the full animation — `scrollWidth`
  stayed pinned at `clientWidth` (430) throughout; re-verified no regression at 1280px desktop too.

### R9 — Perf sanity ✓ no bugs (1 false alarm dismissed)
- Landing page: 17 concurrently running Web Animations, **0** targeting a disconnected (removed)
  element — no leaked/orphaned animation instances.
- Planner page: 17 animations at rest; rapid-fired 4 mood-tile switches in <150ms increments (the
  scenario most likely to orphan a CSS animation on an unmounting/remounting node) → 12 animations
  after settle, still **0** disconnected targets.
- `PerformanceObserver({type:"layout-shift"})` over 3s on the landing page with marquee + gn-drift +
  gn-bob + gn-cloud + gn-floaty all actively running simultaneously → **CLS = 0**, zero entries.
  Expected: every motion-pack animation only touches `transform`/`background-position`/
  `background-size` (compositor-only or paint-only properties), never triggers layout.
- Console: only the standard React DevTools info banner — no warnings, no errors, on either page.
- **False alarm dismissed**: an initial "static region, 3s apart" screenshot diff came back
  non-identical. The clip region (viewport top 500px after `scrollTo(0,900)`) still included the
  tail of the actively-scrolling `.gn-marquee` ticker (document Y 911–927.5, just inside the top of
  a 900–1400 viewport slice) — i.e., the "static" region wasn't actually static, it was legitimately
  animating marquee content. Re-scrolled precisely below the marquee's `getBoundingClientRect()`
  bottom edge and re-ran both a strict byte-compare (`Buffer.compare === 0`) and a tolerance-based
  pixel diff (0 of 128,000 sampled pixels differing) — confirmed genuinely pixel-stable once the
  marquee is correctly excluded from the "no intentional motion" region.

### R10 — Full regression ✓ green
- `npx tsc --noEmit` — clean, 0 errors.
- `npm run check` — **49/49 tests green** (32 logic + 17 infra), unchanged pass count from before
  the motion-pack fixes (Confetti/landing edits don't touch anything under test).
- `journey.mjs` — 13/13, 0 console errors, run against the still-warm dev server.
- Killed the dev server on :3000, ran `npm run build` — compiles successfully, generates all 22
  routes, no type/lint errors surfaced during build.
- Restarted `npm run dev` fresh, waited for the server to report ready, re-ran `journey.mjs` against
  the cold-started server — **13/13 green on the first try**, 0 console errors.

## Bugs found + fixed (3)
| # | Round | File:line | Bug | Fix |
|---|-------|-----------|-----|-----|
| 1 | R5 | `app/page.tsx:32` | "Fare confirmed" floaty badge overlapped hero headline at 1280px/1024px | `left-[6%]`→`left-[1%]`, and raised to `hidden … xl:flex` (was unconditional `flex`, inherited `lg` from wrapper) |
| 2 | R5 | `app/page.tsx:36` | "Lat Phrao → Siam" floaty badge overlapped hero headline at 1280px/1024px | `right-[5%]`→`right-[1%]`, and raised to `hidden … xl:flex` |
| 3 | R8 | `components/Confetti.tsx:20-21` | Confetti bits rendered past the viewport edge, causing real (if transient, ~2.8s) `document.documentElement.scrollWidth` > `clientWidth` horizontal overflow, worst on mobile (55px at 430px) but present at any width | Narrowed bit randomization envelope from `left∈[0,99]%/dx∈[-60,59]px` to `left∈[8,90]%/dx∈[-24,23]px` so every bit stays inside the viewport down to ~320px wide |

## False alarms dismissed (4)
| Round | What looked wrong | Why it wasn't a bug |
|-------|--------------------|----------------------|
| R3 | fly-to-plan ghost appeared to land ~355px off-target vertically | Playwright's auto-scroll-into-view (for a below-the-fold button) happened between my two measurement calls; re-measured both sides fresh/post-scroll via a monkey-patched `Element.prototype.animate` capture — 0.0px landing error |
| R5 | Cloud emoji sticker flagged as overlapping `<h1>` bounding box at 1024px | `<h1>` bounding rect spans its full centered multi-line container; screenshot shows clear whitespace between the cloud and any actual glyph — bounding-box-only artifact |
| R6 | `.gn-line-grow` computed `transform` read `scaleY(0)` right after mount | Probe ran ~50ms into a 950ms (0.15s delay + 0.8s duration) animation; re-checked past completion — `scaleY(1)`, `getAnimations()` reports `finished` at `currentTime: 950` |
| R9 | "Static" region screenshot changed over 3s | Clip region still included the tail of the actively-scrolling marquee ticker; re-scrolled fully below it — 0/128,000 sampled pixels differ |

## Out of scope, noted not fixed
- `intent=family&indoor=1` (the "Family day" mood tile) returns 0 venues from the fixtures API —
  a pre-existing data-coverage gap unrelated to the motion pack. Not touched.

## Final verify status
- `npx tsc --noEmit`: clean
- `npm run check`: 49/49 green
- `journey.mjs` (13-step E2E, EN selectors): 13/13 green, 0 console errors — verified both against
  the warm dev server and a cold-restarted one after `npm run build`
- `npm run build`: succeeds, 22 routes generated, no errors
