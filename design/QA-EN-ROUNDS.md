# GoNai English Translation — Design/QA/Debug 10 Rounds
Date: 2026-07-21 · Tester: Claude (Playwright headless + curl + eyeball every screenshot)

## Scope
Translate ALL user-facing text to English (UI chrome, labels, toasts, API errors, fixtures
placeholder data, TripRecap canvas, metadata) — code comments stay Thai. ฿ symbol kept.
Then 10 improvement rounds. journey.mjs rewritten with English selectors (13 steps).

## Rounds

### R1 — Translation completeness sweep ✓
- Automated sweep: grep Thai chars (excluding comments + ฿ U+0E3F) across app/components/lib
- Found 4 leftovers after main pass (me heading, Suspense fallback, server.ts synthetic leg,
  catalog warn) → fixed. Final: 0 user-facing Thai lines.

### R2 — Full journey E2E (13 steps, EN selectors) ✓ after 1 flake
- First run failed at welcome (hot-reload compiling freshly edited pages mid-run) — selector
  verified correct via DOM probe (count=1), rerun green 13/13, no console errors.

### R3 — Planner visual pass → 3 fixes
1. **Blank flash on refetch (real bug)**: card grid remounted via key={listKey} on every
   filter/intent change → area went blank for fetch+stagger duration (this is also what the
   previous agent misread as "mood tiles broken"). Fix: removed remount; rise animation now
   only on first mount.
2. **"20-20฿" route rows**: equal min/max not collapsed in col-1 route box → now "20฿".
3. Copy: "02 — Pick a spot — top N of M" double em-dash → "· top N of M".
- Verified intent-chip state via DOM (Work=bg-pill active): the "Date chip looks active"
  effect is the yellow 💛 emoji glowing on dark, not a state bug.

### R4 — Trip/Done visual pass ✓ no fixes
- Sticky tracker math correct (route mid 44/47฿ per origin), timeline states correct,
  split-pay ceil(44/3)=15฿ correct. Count-up mid-flight visible in screenshots (by design).

### R5 — Explore → 1 fix
- **Loading state showed "Nothing matches this filter" (real bug)**: empty-state message
  rendered while /api/explore was still in flight. Fix: hot=null → "Loading spots…",
  empty message only after load.

### R6 — Landing/Me/Explore settled pass ✓ no fixes
- Fraunces italic reads even better in English ("know every baht"). Me stats honest zeros,
  badges show real progress, explore chart + intent-emoji HIT badges correct.

### R7 — Edge cases ✓
- All 5 filters stacked → 0 results with proper empty state · rain banner shows real
  Open-Meteo data (90% @16:00 during test) · welcome revisit allowed (intentional redo).

### R8 — API smoke ✓ (all expected codes)
- health ok · plans invalid intent/negative budget → 400 · imports bad host → 400 EN message
- waitlist without consent → 400 EN · foreign-cookie plan/chain read → 404 (ownership holds)
- origin=other → Grab-formula fallback EN label + weather payload intact

### R9 — Mobile 430px ✓ no fixes
- Mood tiles 2×2, tracker sticky, timeline readable, numbers settle correctly
  (Bang Kapi 47฿ → 403฿ left).

### R10 — Full regression ✓
- tsc clean · 49 unit/logic tests green (bahtChipText expectation updated to EN labels)
- journey 13/13 green, no console errors · production build passes

## Known notes
- Venue names carry "(sample)" suffix — replaced wholesale by W2 real data later.
- Count-up numbers appear "wrong" in mid-animation screenshots; settled values verified
  correct in every case checked (44→15/person, 47→403 left).
