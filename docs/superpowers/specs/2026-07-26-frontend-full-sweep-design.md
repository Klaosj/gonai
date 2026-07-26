# GoNai Frontend Full Sweep — Design Spec (2026-07-26)

> ที่มา: audit 5 มิติ (UX journey · architecture · performance · a11y · visual consistency) โดย agent 5 ตัวอ่านโค้ดจริงทุกหน้า — 52 findings อ้าง file:line · Klao เลือก scope "Full sweep ทุกมิติ" โดยให้น้ำหนัก UX flow & conversion นำ
> เอกสารนี้คือ "อะไร+ทำไม" — แผนราย step อยู่ที่ writing-plans ขั้นถัดไป

## Goal

เก็บทุก finding จาก audit ให้จบในรอบเดียว โดยเรียง refactor เป็นฐานก่อนแล้วค่อยลงงาน UX/a11y/visual บนโค้ดที่สะอาดแล้ว — จบแล้ว user journey บนมือถือต้องครบทุกหน้า, จังหวะ conversion ไม่รั่ว, ไม่มีปุ่มตาย/สัญญาที่เงียบหาย, a11y ผ่านเกณฑ์หลัก, หน้าตาเป็นระบบเดียวกันทุกหน้า

## การตัดสินใจของ Klao (2026-07-26 — ห้ามเปิดใหม่ระหว่าง implement)

1. **Mobile nav = Bottom tab bar** ติดล่างจอ < 640px ครบ 4 แท็บ (ไม่ใช่ pill เลื่อนใน header)
2. **ลำดับมือถือของ /app**: การ์ด Top 3 ขึ้นก่อนใต้ mood tiles · แชทเป็น panel ยุบ/ขยายใต้การ์ด
3. **Hairline `--line`**: เข้มขึ้นเล็กน้อยไปโทน `#c9c9c1` ให้ contrast ≥ 3:1 บนขาว — **ต้อง render เทียบก่อน/หลังให้ Klao ดูก่อน commit** (ค่าสุดท้ายเลือกจากภาพจริง ไม่ใช่คำนวณอย่างเดียว)
4. **ไอคอน VenueCard**: คง lucide เป็นภาษา "data icon" ของการ์ดร้านโดยเจตนา — บันทึกกติกาใน comment ของ VenueCard · ที่อื่นใช้ emoji ต่อ

## Constraints (สืบทอดจากที่ final แล้ว)

- ห้ามแตะ: พื้นขาว/หมึก/เขียว/brand gradient, ฟอนต์ IBM Plex (v0.8), dark mode (ข้าม), ข้อความ UI ภาษาอังกฤษ, comment/docs ไทย
- ห้ามเพิ่ม npm dependency ใหม่ (IntersectionObserver/focus trap เขียนเองสั้นๆ ได้)
- `.o-marker` 74% ห้ามคำนวณเอง ต้องดูภาพจริงถ้าจะยุ่ง (ไม่ควรต้องยุ่งในรอบนี้)
- path repo มี apostrophe — quote ทุกครั้ง · webpack cache bug → `rm -rf .next` แล้ว retry
- commit ต่อ phase ข้อความไทย · ห้าม push
- baseline: `npm run check` 78 ข้อเขียว · commit ล่าสุด `117bf23`

## Phase 0 — Safety net

frontend ไม่มี component test เลย — ก่อน refactor ต้องมีตาข่าย:

- รัน `journey.mjs` (13 ขั้น, selector อังกฤษ) กับ dev server ให้เขียวเป็น baseline — ถ้าแดงต้องแก้ให้เขียวก่อนเริ่มทุกอย่าง
- ขยาย journey ให้ครอบหน้า explore / me / share (`/p/[id]`) อย่างน้อยระดับ smoke (โหลดหน้า + element หลักปรากฏ)
- เก็บ CDP screenshot baseline ทุกหน้า @ 360/390/768/1280 ไว้เทียบหลังจบ

## Phase 1 — Foundation refactor (architecture)

ปัญหา: god component 2 ตัว + pattern เดียวกัน copy 2-6 ที่และ drift แล้วจริง (พิสูจน์ได้จาก `app/p/[id]/page.tsx` ที่ CATEGORY_EMOJI กลายเป็น type หลวม)

1. **`lib/venue-display.ts`** — รวม `CATEGORY_EMOJI` (6 สำเนา), `CATEGORY_AMBIENCE` (4 สำเนา), `INTENT_*` maps · key ด้วย union type จริงจาก `lib/types.ts` · import แทนทุกที่
2. **`useToast()` + `<Toast/>` host เดียวใน `app/shell.tsx`** ผ่าน context — แทน state+markup ที่ copy 4 หน้า (planner-client:162,1158 · plan/[id]:104,643 · me:119,457 · explore:97,342)
3. **`useApiResource<T>(path)`** → `{ data, error, reload }` — แทน gn()-fetch boilerplate ทุกจุด · ปิดบั๊ก explore/shell ที่ `.catch(() => {})` กลืน error เงียบ (explore/page.tsx:103-107, shell.tsx:86-90)
4. **`usePlan(planId)`** → `{ plan, act, acting: string | null }` — รวม `act()` ที่ซ้ำ 2 ที่ด้วย lock คนละแบบ (planner-client:394-411 ref-boolean vs plan/[id]:126-142 acting-string) ใช้แบบ acting-string ที่ richer
5. **แตก `app/app/plan/[id]/page.tsx` (760 บรรทัด)** → `PlanView` / `TripView` / `DoneView` ไฟล์ละตัว บน `usePlan` ร่วม (DoneSummary เป็น function แยกอยู่แล้ว — ย้ายไฟล์)
6. **แตก `app/app/planner-client.tsx` (1,172 บรรทัด / 23 useState)** → hooks `useVenueSearch()` + `useChatToPlan()` + `usePlan` + component `ChatPanel` (state แชทอยู่ในนั้น — แก้ P1 keystroke re-render ทั้งหน้าไปในตัว) · `VenueCard` ครอบ `React.memo` + callback stable
7. **`<VenueSuggestSheet/>`** — รวม bottom sheet chain/replan ที่ซ้ำ 2 ที่ (planner-client:1116-1156, plan/[id]:588-641) · รองรับ variant indoor-reason
8. **`<StopTimelineList variant="interactive"|"readonly"/>`** — รวม timeline render ที่เขียนซ้ำ (planner-client:984-1024, p/[id]:60-85) กันหน้าแชร์ drift จาก planner
9. **`<MoneyProgress/>`** — generalize BudgetBar ใช้ทั้ง plan/[id]:267 และกล่องงบ inline ใน planner-client:925-973
10. **ลบของตาย**: `components/IntentChips.tsx` (0 references) · token `--color-gn-*` ที่ไม่ใช้ ~30 ตัว (เหลือที่ใช้จริง: gn-cream/gn-line/gn-card + ตัวที่ phase 4 จะใช้ เช่น gn-amber-*) · keyframe `.gn-bob` ซ้ำ (globals.css:583-594)

**Definition of done ของ phase**: journey.mjs เขียวเท่า baseline · ไม่มี behavior เปลี่ยน (refactor ล้วน) · บรรทัดรวมของ 2 god component ลด > 50%

## Phase 2 — Journey & conversion (หัวใจของรอบ)

1. **[P0] Bottom tab bar มือถือ** — < 640px ครบ 4 แท็บ (Plan/Explore/Group/Me) ใน `app/shell.tsx` · ใช้ safe-area inset · หน้า content เผื่อ padding-bottom กัน tab bar ทับ (ระวังชนกับ sticky budget bar ใน planner ที่ createPortal ไป body — ต้องอยู่ร่วมกันได้)
2. **กัน active trip ซ้อน** — server: PATCH action `start` ปฏิเสธเมื่อ user มี plan status `active` อยู่แล้ว (คืน error message ชัดพร้อม id ทริปเดิม — `app/api/plans/[id]/route.ts:58-60`) · draft สร้างได้ตามเดิม · client: /app แสดง banner "Continue your trip in progress →" เหนือ mood tiles เมื่อ /api/me มี active plan (planner-client ตอนนี้ไม่รู้จัก active plan เลย)
3. **Add to plan เหลือ round-trip เดียว** — POST `/api/plans` คืน `ExpandedPlan` เต็ม (server มี expandPlan/venueById อยู่แล้ว — `app/api/plans/route.ts:37-61`) · ลบ GET ตามหลังใน client
4. **`app/error.tsx` + `app/not-found.tsx` + `app/app/loading.tsx`** — สไตล์ Forest on White + ปุ่มกลับ /app · loading ใช้ `SkeletonPage` (export อยู่แล้ว ยังไม่มีใครใช้) · เปลี่ยน Suspense fallback ของ `app/app/page.tsx:6` จาก text เปล่าเป็น SkeletonPage ด้วย
5. **DoneView เพิ่ม CTA "Plan another day →"** ลิงก์ /app ท้าย summary (จังหวะที่ user พร้อมวางแผนรอบถัดไปที่สุด)
6. **หน้าแชร์ CTA → `/app`** ตรง (ตอนนี้ไป landing — p/[id]:98)
7. **unseen gem หมด pool ต้องบอก** — surface `unseenPoolEmpty` (ส่งจาก server อยู่แล้ว, client ประกาศใน interface แต่ไม่เคยใช้) เป็น note เล็กใน col 2: "No confirmed Unseen gem for this combo yet — showing our next best Hit"
8. **ประวัติแยก draft ออกจากทริปจริง** — "Past trips" แสดงเฉพาะ active/done · drafts อยู่กลุ่มพับ "Drafts" พร้อมลบรายตัว → **API ใหม่: DELETE `/api/plans/[id]`** (owner check ตาม pattern เดิม + test ตาม convention)
9. **ลำดับมือถือ /app ใหม่** (ตามการตัดสินใจข้อ 2): mood tiles → Top 3 cards → แชทยุบ/ขยาย (default ยุบเมื่อจอ < lg เว้นแต่มาจาก `/app?q=` ที่ auto-send — กรณีนั้นเปิดแชท) → เงื่อนไข/งบ
10. **Wire ปุ่ม "Watch clip"** — `components/VenueCard.tsx:150-154` เปิด `venue.video_url` แท็บใหม่ (`rel="noopener noreferrer"`) — กันปุ่มตายโผล่ตอน W2 data จริงเข้า
11. **`/api/me` ยิงครั้งเดียว** — `MeProvider` ใน shell แชร์ผ่าน context · planner-client (last-trip card) กับ me page อ่านจาก context (ตอนนี้ยิงซ้ำ 2-3 ครั้งต่อ view)

## Phase 3 — Accessibility

1. explore video card: `<div onClick>` → `<button>` จริง + overlay ใส่ `role="dialog" aria-modal` + focus on open + Esc (explore:276-294, 317-340)
2. `/app` ไม่มี h1 เลย — เพิ่ม h1 ("Plan your day") + ยก `gn-step` 01/02/03 เป็น h2 จริง (คงหน้าตาเดิมด้วย class เดิม)
3. แชท: ครอบ message list ด้วย `role="log" aria-live="polite" aria-relevant="additions"`
4. `LoadingSkeleton` ทุก variant: `role="status" aria-live="polite"` + `<span class="sr-only">Loading…</span>`
5. `useFocusTrap` hook (เขียนเอง ~20 บรรทัด) ใช้กับ VenueSuggestSheet (ตัวเดียวหลัง phase 1 รวมแล้ว) + คืน focus ตัว trigger ตอนปิด
6. `aria-pressed` บน chips ทุกชุด (filter/intent/origin/mood/explore tabs) + `aria-current` ที่ view toggle และ tab nav
7. ปุ่ม Save หัวใจ: `aria-pressed={saved}` + label สลับ "Save"/"Remove from saved" (VenueCard:67-82)
8. `aria-label` ทุก input เงิน/ข้อความที่มีแต่ placeholder (WaitlistForm, SpendInput, budget edit ×2, price confirm)
9. WaitlistForm: success `role="status"` / error `role="alert"`
10. reduced-motion เพิ่ม `.gn-chat-hl` + `.gn-burst i` (globals.css:693-725 ครอบ 13/15 อยู่)
11. touch target ≥ 24px: route-toggle pill ใน VenueCard + ปุ่ม Dismiss ✕ ของ memory card
12. **`--line` → โทน `#c9c9c1`** (การตัดสินใจข้อ 3) — render เทียบ 2-3 หน้าให้ Klao ดูก่อน commit phase นี้

## Phase 4 — Visual consistency & craft

1. เทา mut เฉดเดียว: `--mut` (#70746e) → `var(--color-mut)` (#63675f) + แก้ const `MUT` ใน TripRecap.tsx — ปิดปัญหาการ์ด PNG แชร์สีเพี้ยนจากหน้าจอ
2. h1 ของหน้า app มาตรฐานเดียว: `text-[22px] font-medium` (ค่าเดิมของ plan/[id] + me) → ปรับ welcome (26px/semibold), group+explore (24px/medium), p/[id] (22px/semibold)
3. `.gn-warn-banner` utility เดียว (radius เดียว + `gn-amber-bg/bd` tokens) แทน 5 จุดที่ทรงต่างกันหมด (plan/[id]:298,311,373 · planner-client:670,1027)
4. CTA landing ใช้ `var(--gn-brand-grad)` แทน gradient hardcode ที่ teal เพี้ยนจากโลโก้ (app/page.tsx:164)
5. motion pack ลงหน้าที่โล่ง: explore (venue grid gn-rise + stagger), group (feature cards), p/[id] (recap card)
6. landing ใต้ fold: scroll-triggered `gn-rise` ผ่าน IntersectionObserver utility เล็ก (Problem grid, How it works, Features — ตอนนี้ hero มี entrance อย่างเดียว)
7. explore:162 `#f7f7f4` hardcode → `bg-bg-elev`
8. icon size ของ list-row pattern (`gn-card-e flex items-start gap-3 p-4`) → `text-2xl` ทั้ง 3 จุด (page.tsx:108,154 · group:28)
9. bottom sheet shadow → `shadow-[var(--gn-shadow-3)]` แทน `shadow-2xl` stock
10. YouTube thumbnails ใส่ `loading="lazy" decoding="async"` (explore:283-288)

## Phase 5 — Verification & closeout

- `npm run check` (78 ข้อ) + `npm run build` เขียว
- journey.mjs (รวม smoke ใหม่จาก phase 0) เขียว
- CDP screenshot กวาดทุกหน้า @ 360/390/768/1280 เทียบ baseline phase 0 — การเปลี่ยนแปลงต้องอธิบายได้ทุกจุด (มาจาก phase 2-4 ข้อไหน)
- spot check: prefers-reduced-motion, keyboard-only ผ่าน flow หลัก (เลือกร้าน → add → start → done), recap PNG เทียบสี mut
- อัพเดต `PLAN.md` (โครงสร้างไฟล์ใหม่ + จำนวน test) · commit ต่อ phase รวม ~6 commits

## ตัดออกโดยตั้งใจ

- แปลง route เป็น server-shell + client-island ทั้งแอป — bundle 120kB first load เบาอยู่แล้ว งานใหญ่ผลตอบแทนต่ำ (ยกเว้นที่ได้ฟรีจากการแตกไฟล์ phase 1)
- next/image + remotePatterns สำหรับ YouTube thumbs — `loading="lazy"` พอที่ scale นี้
- dark mode, i18n toggle — ตามคำสั่งเดิม
- แก้ minors ของ W2 pipeline ที่อยู่ใน ledger รอบก่อน — คนละ track

## Execution model

เหมือนรอบ launch-readiness: Opus supervisor + sonnet workers ราย task · supervisor ตรวจ diff + รัน test เองก่อนรับทุก task · commit ต่อ phase · ห้าม push · Klao เป็นคน review จุดที่ spec ระบุว่า "ให้ Klao ดูก่อน commit" (hairline)
