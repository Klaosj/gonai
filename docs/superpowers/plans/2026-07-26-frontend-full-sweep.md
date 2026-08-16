# GoNai Frontend Full Sweep — Implementation Plan (2026-07-26)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เก็บ 52 findings จาก audit 5 มิติให้จบตาม spec `docs/superpowers/specs/2026-07-26-frontend-full-sweep-design.md` — spec คือ authority เรื่อง "อะไร/ทำไม" แผนนี้คือ "ทำยังไงทีละก้าว"

**Architecture:** 6 phases เรียงเป็นฐานต่อกัน: safety net → foundation refactor → journey/conversion → a11y → visual → verification · hairline เป็น task ปิดท้ายที่ต้องรอ Klao ดูภาพก่อน commit

**Tech Stack:** Next.js 15 + React 19 + Tailwind v4 · test = tsx scripts + journey.mjs (raw CDP, no deps) · ไม่มี component-test framework และห้ามเพิ่ม

## Global Constraints

- Repo: `/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/GoNai` — path มีช่องว่าง ต้อง quote เสมอ (ย้ายจาก `Klao's Workspace/Code/gonai` 2026-08-12) · build พังด้วย `__webpack_modules__` → `rm -rf .next` แล้ว retry
- ห้ามเพิ่ม npm dependency · ห้ามแตะ: สี/ฟอนต์หลักที่ FINAL, dark mode, `.o-marker` 74%
- UI text อังกฤษ · comment/docs ไทย · commit ต่อ task (ละเอียดกว่า spec ที่ว่า "ต่อ phase" — เจตนา: bisect/รีวิวง่ายกว่า) ข้อความไทย prefix `fe<phase>.<n>:` · **ห้าม push**
- Baseline: HEAD `c4a4ceb`, `npm run check` 78 ข้อเขียว, working tree สะอาด
- ทุก task จบด้วย: `npm run check` เขียว + `npm run build` เขียว (task ที่แตะแค่ docs/ข้าม build ได้) + journey เขียว (ตั้งแต่ T0.1 เป็นต้นไป)
- **กติกางานแตกไฟล์ (T1.5, T1.7):** แผนให้ contract + แผนที่บรรทัดจาก scout — worker **ต้องอ่านไฟล์จริงทั้งช่วงก่อนย้ายโค้ด** ห้าม generate จากจินตนาการ · การแตกคือ "ย้าย" ไม่ใช่ "เขียนใหม่" — logic เดิมทุกบรรทัดต้องไปโผล่ที่ใหม่หรือถูกแทนด้วย shared ที่ระบุในแผน
- เลขบรรทัดทั้งหมดอ้าง HEAD `c4a4ceb` — งาน task ก่อนหน้าจะเลื่อนบรรทัด ใช้ anchor จากเนื้อโค้ดที่ quote ไว้ ไม่ใช่เลขบรรทัดตายตัว
- hook `[Fact-Forcing Gate]` อาจ block Bash/Write แรก — present facts ที่ขอ แล้ว retry

---

## Phase 0 — Safety net

### Task 0.1: เขียน `tests/journey.mjs` (raw-CDP smoke driver) + baseline

**Files:**
- Create: `tests/journey.mjs`
- Modify: `package.json` (script `journey`), `.gitignore` (`design/qa/`)

**Interfaces:**
- Produces: `npm run journey` — ต้องมี dev server ที่ `localhost:3000` · exit 0 = ทุก step ผ่าน + console error 0 · screenshot ลง `design/qa/<run-name>/`
- ใช้ global `WebSocket`/`fetch` ของ Node ≥22 เท่านั้น (เช็คก่อน: `node -e "console.log(typeof WebSocket)"` ต้องได้ `function`)

- [ ] **Step 1: เขียนไฟล์** — harness นี้สมบูรณ์ ส่วน `STEPS` คือเจตนา assert ที่ worker ต้องรันจริงแล้วปรับ selector ให้ตรง DOM (ห้ามลบ/อ่อน assert — แก้ selector ได้เท่านั้น):

```js
// journey.mjs — smoke ทุกหน้าผ่าน headless Chrome (raw CDP, ไม่มี dependency)
// รัน: npm run dev (รอ ready) แล้ว npm run journey
// ต้องการ Node >= 22 (global WebSocket) · Chrome ที่ /Applications หรือ env GN_CHROME_BIN
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.GN_BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.GN_CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9223;
const SHOT_DIR = path.join("design", "qa", process.env.GN_QA_RUN ?? "journey-latest");

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${fs.mkdtempSync("/tmp/gn-chrome-")}`,
  "--no-first-run", "about:blank",
], { stdio: "ignore" });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTab() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/new?url=about:blank`, { method: "PUT" });
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* chrome ยังไม่พร้อม */ }
    await wait(250);
  }
  throw new Error("Chrome DevTools ไม่ตอบ");
}

let msgId = 0;
const pending = new Map();
let consoleErrors = [];
const ws = new WebSocket(await newTab());
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails?.text ?? "exception");
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    consoleErrors.push(m.params.args?.[0]?.value ?? "console.error");
  }
};
await new Promise((r) => (ws.onopen = r));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");

async function nav(url) {
  await send("Page.navigate", { url: BASE + url });
  await wait(1600); // hydration + fetch แรก
}
async function setWidth(w) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 640 });
  await wait(300);
}
async function evalJS(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result.value;
}
async function waitFor(expr, timeoutMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJS(expr)) return true;
    await wait(400);
  }
  return false;
}
async function shot(name) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
}

const NO_OVERFLOW = "document.documentElement.scrollWidth <= window.innerWidth + 1";
// STEPS: worker รันจริงแล้วปรับ expression ให้ตรง DOM ปัจจุบัน — ห้ามตัด step
const STEPS = [
  { name: "landing-loads", url: "/", width: 1280, expr: `!!document.querySelector('a[href="/app"]')` },
  { name: "landing-waitlist", url: "/", width: 1280, expr: `!!document.querySelector("form input")` },
  { name: "app-budget-target", url: "/app", width: 1280, expr: `!!document.getElementById("gn-budget-target")` },
  { name: "app-chat-input", url: "/app", width: 1280, expr: `!!document.querySelector("input[placeholder]")` },
  { name: "explore-tabs", url: "/app/explore", width: 1280, expr: `document.querySelectorAll("button").length >= 5` },
  { name: "me-past-trips", url: "/app/me", width: 1280, expr: `document.body.innerText.includes("Past trips")` },
  { name: "group-loads", url: "/app/group", width: 1280, expr: `!!document.querySelector("h1")` },
  { name: "welcome-loads", url: "/app/welcome", width: 1280, expr: `!!document.querySelector("h1")` },
  { name: "share-bad-404", url: "/p/bad?k=bad", width: 1280, expr: `document.body.innerText.includes("404")` },
  { name: "no-overflow-360-app", url: "/app", width: 360, expr: NO_OVERFLOW },
  { name: "no-overflow-390-app", url: "/app", width: 390, expr: NO_OVERFLOW },
  { name: "no-overflow-768-app", url: "/app", width: 768, expr: NO_OVERFLOW },
  { name: "no-overflow-360-explore", url: "/app/explore", width: 360, expr: NO_OVERFLOW },
];

let pass = 0, fail = 0;
for (const s of STEPS) {
  await setWidth(s.width);
  await nav(s.url);
  const ok = await waitFor(s.expr);
  await shot(`${s.name}-${s.width}`);
  console.log(`  ${ok ? "✓" : "✗"} ${s.name} @${s.width}`);
  ok ? pass++ : fail++;
}
// ยอมรับ error จาก devtools เองเท่านั้น — error จากแอปต้องเป็น 0
consoleErrors = consoleErrors.filter((e) => !String(e).includes("DevTools"));
console.log("═".repeat(50));
console.log(`  ${pass} passed, ${fail} failed · console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5).map((e) => `    · ${e}`).join("\n"));
chrome.kill();
process.exit(fail > 0 || consoleErrors.length > 0 ? 1 : 0);
```

- [ ] **Step 2:** `package.json` เพิ่ม `"journey": "node tests/journey.mjs"` · `.gitignore` เพิ่มบรรทัด `design/qa/`
- [ ] **Step 3:** boot dev server (background), รอ ready แล้ว `GN_QA_RUN=baseline-2026-07-26 npm run journey` — ปรับ selector ใน STEPS ให้เขียวครบทุก step (ถ้าหน้าไหนพังจริงให้หยุดรายงาน อย่าอ่อน assert) · screenshot baseline อยู่ `design/qa/baseline-2026-07-26/`
- [ ] **Step 4:** Commit: `git add tests/journey.mjs package.json .gitignore && git commit -m "fe0.1: journey smoke (raw CDP ไม่มี dep) + baseline screenshots"`

---

## Phase 1 — Foundation refactor

### Task 1.1: `lib/venue-display.ts` — รวม map ที่ copy 6 ที่

**Files:** Create `lib/venue-display.ts` · Modify: `components/VenueCard.tsx:10-24`, `app/app/planner-client.tsx:1167-1172`, `app/app/plan/[id]/page.tsx:20-33`, `app/app/me/page.tsx:29-41`, `app/app/explore/page.tsx:19-34`, `app/p/[id]/page.tsx:17-22`

**Interfaces — Produces:**
```ts
// lib/venue-display.ts — แผนผังการแสดงผลราย category/intent (ที่เดียวทั้งแอป)
import type { Venue } from "./types";

export const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕", restaurant: "🍜", activity: "🎨", market: "🛍️",
};
export const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work", restaurant: "o-ambience-date", activity: "o-ambience-photo", market: "o-ambience-family",
};
```
(ถ้าไฟล์ไหนมี `INTENT_*` map ประจำไฟล์ที่ซ้ำกับไฟล์อื่น ให้ย้ายเข้าที่นี่ด้วยรูปแบบเดียวกัน — เช็คด้วย grep ก่อน)

- [ ] Step 1: สร้างไฟล์ตาม code ข้างบน
- [ ] Step 2: แทนที่ local map ทั้ง 6 จุดด้วย import — ระวัง `p/[id]` ที่ type หลวม `Record<string,string>` + fallback `?? "📍"`: ใช้ typed map แล้วคง fallback ไว้ที่จุดใช้ถ้า key มาจาก string อิสระ
- [ ] Step 3: `grep -rn "CATEGORY_EMOJI\s*[:=]" app components lib` → ต้องเหลือแค่ lib/venue-display.ts
- [ ] Step 4: check + build + journey เขียว → commit `fe1.1: lib/venue-display — รวม category map 6 สำเนา (ตัว p/[id] drift เป็น type หลวมแล้ว)`

### Task 1.2: `useToast` + host เดียวใน Shell

**Files:** Create `lib/use-toast.tsx` · Modify `app/shell.tsx` (mount provider+host), ลบ toast state/markup ใน `app/app/planner-client.tsx` (162, 185-188, 1158-1162), `app/app/plan/[id]/page.tsx` (104, 112-115, 643-647), `app/app/me/page.tsx` (119-123, 457-461), `app/app/explore/page.tsx` (97-101, 342-346)

**Interfaces — Produces:**
```tsx
// lib/use-toast.tsx — toast กลาง: host เดียวใน Shell แทน markup ที่ copy 4 หน้า
"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" className="gn-toast fixed bottom-[26px] left-1/2 z-[120] -translate-x-1/2">
          {toast}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
```
(className ของ host ให้ลอกจากของจริงใน planner-client:1158-1162 ถ้าต่างจากร่างนี้ — ของจริงชนะ)

- [ ] Step 1: สร้างไฟล์ · ครอบ `<ToastProvider>` ใน `app/shell.tsx` รอบ children ทั้งหมดของ Shell
- [ ] Step 2: ทั้ง 4 หน้า: ลบ `toast` state + `showToast` + JSX toast → `const showToast = useToast()` (ชื่อ call site เดิมใช้ต่อได้)
- [ ] Step 3: `grep -rn "gn-toast" app components` → เหลือที่เดียวใน use-toast.tsx · ทดสอบจริง: กด save venue ผ่าน CDP ดู toast โผล่ (supervisor ตรวจ)
- [ ] Step 4: check+build+journey → commit `fe1.2: useToast host เดียวใน Shell — ลบ toast copy 4 หน้า`

### Task 1.3: `useApiResource` — จบ fetch boilerplate + ปิด error ที่ถูกกลืน

**Files:** Create `lib/use-api-resource.ts` · Modify: `app/shell.tsx:86-90`, `app/app/plan/[id]/page.tsx:117-122`, `app/app/me/page.tsx:125-129`, `app/app/explore/page.tsx:103-107`

**Interfaces — Produces:**
```ts
// lib/use-api-resource.ts — fetch ผ่าน gn() พร้อม loading/error/reload มาตรฐานเดียว
"use client";
import { useCallback, useEffect, useState } from "react";
import { gn } from "./api";

export function useApiResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    if (!path) return;
    setError(false);
    gn<T>(path).then(setData).catch(() => setError(true));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, reload: load, setData } as const;
}
```

- [ ] Step 1: สร้าง hook · แทนที่ 4 จุด (path=null ใช้กรณี id ยังไม่พร้อม) — explore `hot` ที่เคย `.catch(() => {})` ต้องได้ error UI + ปุ่ม retry แบบเดียวกับหน้าอื่น (ลอก pattern loadError ของ me:131-141)
- [ ] Step 2: planner-client `load` **ไม่แตะ** (ผูก pendingChat — ไป T1.7)
- [ ] Step 3: check+build+journey → commit `fe1.3: useApiResource — มาตรฐาน fetch/error/reload เดียว + explore เลิกกลืน error เงียบ`

### Task 1.4: `usePlan` — act() เดียว lock เดียว

**Files:** Create `lib/use-plan.ts` · Modify: `app/app/plan/[id]/page.tsx` (แทน act 126-142 + state ที่เกี่ยว), `app/app/planner-client.tsx` (แทน act 395-411 + actingRef 394)

**Interfaces — Produces:**
```ts
// lib/use-plan.ts — plan CRUD กลาง: act() PATCH หนึ่งเดียว lock ด้วย acting:string|null
"use client";
import { useCallback, useState } from "react";
import { gn } from "./api";
import type { ExpandedPlan } from "./server";

export function usePlan(initial: ExpandedPlan | null = null) {
  const [plan, setPlan] = useState<ExpandedPlan | null>(initial);
  const [acting, setActing] = useState<string | null>(null);
  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}, key = action): Promise<ExpandedPlan | null> => {
      if (!plan || acting) return null;
      setActing(key);
      try {
        const p = await gn<ExpandedPlan>(`/api/plans/${plan.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action, ...payload }),
        });
        setPlan(p);
        return p;
      } catch {
        return null;
      } finally {
        setActing(null);
      }
    },
    [plan, acting],
  );
  return { plan, setPlan, act, acting } as const;
}
```
(สัญญา request/response ของ PATCH ให้ลอกจาก act เดิมใน plan/[id]:126-142 — ถ้า shape จริงต่างจากร่างนี้ ของจริงชนะ · error ที่เคยโชว์ toast ให้คงพฤติกรรมเดิมที่ call site)

- [ ] Step 1: สร้าง hook · plan/[id] ใช้ก่อน (per-button busy ผ่าน `acting === key` ตามเดิม)
- [ ] Step 2: planner-client แทน act+actingRef ด้วย hook เดียวกัน (`addToPlan` ยังเป็นของหน้า — แตะแค่ act)
- [ ] Step 3: check+build+journey + CDP ทดสอบ start/checkin ผ่านจริง 1 รอบ → commit `fe1.4: usePlan — act() PATCH เดียว เลิก lock สองแบบ`

### Task 1.5: แตก `app/app/plan/[id]/page.tsx` (760 บรรทัด → 4 ไฟล์)

**Files:** Create `app/app/plan/[id]/plan-view.tsx`, `trip-view.tsx`, `done-view.tsx`, `plan-shared.tsx` · Modify `app/app/plan/[id]/page.tsx`

**Interfaces — Produces (contract การย้าย — worker อ่านไฟล์จริงทั้งไฟล์ก่อน):**
- `plan-shared.tsx`: ย้าย `SpendPrompt` (58-69), `SpendInput` (72-95), `legsSummary` (36-42), `mapsUrl` (44-46), `fmtTimeBKK` (48-55) — export ทุกตัว
- `plan-view.tsx`: JSX บล็อก 239-339 → `export function PlanView(props)` — props คือทุกตัวที่บล็อกนี้อ่าน (plan, act, acting, editingBudget+setter, ฯลฯ — ไล่จากโค้ดจริง)
- `trip-view.tsx`: 342-578 → `TripView` (state เฉพาะโหมด trip เช่น spendingSeq/celebrate/lastCheckin ย้ายเป็น local ได้ถ้าไม่มีใครอื่นอ่าน — เช็คก่อน)
- `done-view.tsx`: `DoneSummary` 652-760 ทั้ง function → `DoneView` (มี local `editingPrice` อยู่แล้ว)
- `page.tsx` เหลือ: โหลด plan (useApiResource), `usePlan`, `effectiveView` (183), view toggle (211-236), suggestions sheet state, สลับ 3 view

- [ ] Step 1: อ่านไฟล์จริง 1-760 ทั้งหมด · ทำตาราง state→view ไหนใช้ ก่อนย้าย
- [ ] Step 2: ย้ายตาม contract — ห้ามแก้ logic ใดๆ ใน task นี้
- [ ] Step 3: `wc -l app/app/plan/[id]/page.tsx` ≤ ~220 · check+build+journey + CDP ผ่าน plan→trip→done ครบ 1 วง
- [ ] Step 4: commit `fe1.5: แตก plan/[id] เป็น PlanView/TripView/DoneView + plan-shared`

### Task 1.6: `VenueSuggestSheet` + `StopTimelineList` + `MoneyProgress`

**Files:** Create `components/VenueSuggestSheet.tsx`, `components/StopTimelineList.tsx` · Generalize `components/BudgetBar.tsx` → `components/MoneyProgress.tsx` · Modify: planner-client (sheet 1116-1156 · timeline 984-1024 · budget box 925-973), plan-view (BudgetBar call เดิม 267), plan/[id]/page (sheet 588-641), `app/p/[id]/page.tsx` (timeline 60-85)

**Interfaces — Produces:**
```ts
// VenueSuggestSheet — bottom sheet เลือกร้าน (chain/replan ใช้ร่วม)
export function VenueSuggestSheet(props: {
  title: string;
  list: Venue[];
  indoorReason?: boolean;        // replan ฝน: โชว์เหตุผล indoor
  adding: string | null;         // venue id ที่กำลัง add (busy state)
  onAdd: (v: Venue) => void;
  onClose: () => void;
}): JSX.Element;

// StopTimelineList — แถวไทม์ไลน์ stop (interactive = planner col3, readonly = หน้าแชร์)
export function StopTimelineList(props: {
  plan: ExpandedPlan;
  variant: "interactive" | "readonly";
}): JSX.Element;

// MoneyProgress — BudgetBar เดิม + prop label/onEdit (สี over/under เดิมทั้งหมด)
export function MoneyProgress(props: {
  label: string;
  value: number;
  target: number;
  onEdit?: () => void;
}): JSX.Element;
```
(หน้าตา/คลาสลอกจาก call site เดิมที่ rich ที่สุดของแต่ละตัว — sheet เอาจาก plan/[id]:588-641 ที่มี indoor variant · timeline เอาจาก planner:984-1024 · MoneyProgress ต่อยอด BudgetBar.tsx:6-32)

- [ ] Step 1: สร้าง 3 components จากโค้ดจริงของ call site ที่ระบุ → แทนที่ทุก call site
- [ ] Step 2: `grep -n "role=\"dialog\"" app components` → sheet เหลือแหล่งเดียว (explore video modal ยังอยู่ — ไป T3.1)
- [ ] Step 3: check+build+journey → commit `fe1.6: VenueSuggestSheet + StopTimelineList + MoneyProgress — ของซ้ำ 2-3 สำเนาเหลือ 1`

### Task 1.7: แตก `app/app/planner-client.tsx` (1,172 บรรทัด / 28 hooks)

**Files:** Create `components/ChatPanel.tsx`, `lib/use-venue-search.ts` · Modify `app/app/planner-client.tsx`, `components/VenueCard.tsx` (React.memo)

**Interfaces — Produces (contract — worker อ่านไฟล์จริงก่อน):**
```ts
// lib/use-venue-search.ts — state การค้นร้าน + load()
export function useVenueSearch(): {
  intent: Intent; setIntent: ...; origin: string; pickOrigin: ...;
  budget: number; setBudget: ...; filters: VenueFilters; toggleFilter: ...;
  data: VenuesResponse | null; loadError: boolean; reload: () => void;
  onLoaded: (cb: (d: VenuesResponse) => void) => void;   // ให้ ChatPanel ฟังผลโหลด (แทน pendingChat resolution เดิมใน load)
};

// components/ChatPanel.tsx — เป็นเจ้าของ chat state ทั้งหมด (แก้ P1 keystroke re-render ทั้งหน้า)
export function ChatPanel(props: {
  onActions: (a: ChatActions) => { applied: string[]; refetch: boolean };  // applyChatActions เดิม — PlannerClient เป็นคน apply
  registerDataListener: (cb: (d: VenuesResponse) => void) => void;         // ต่อกับ onLoaded
  highlightVenue: (id: string) => void;
  initialQuery?: string | null;                                            // /app?q= (auto-send ครั้งเดียว — logic qConsumed 299-307 ย้ายเข้ามา)
}): JSX.Element;
```
state ที่ย้ายเข้า ChatPanel: `chatMsgs, chatInput, chatSending, pendingChat, chatEndRef` + fn `buildChatReply, sendText, sendChat, buildFollowups, sendFollowup` · `hlVenueId`+`highlightVenue` อยู่กับ PlannerClient (การ์ดอยู่ฝั่งนั้น) · mood tiles/import box อยู่ PlannerClient ตามเดิม

- [ ] Step 1: อ่าน planner-client.tsx เต็ม · ทำตาราง state×ผู้ใช้ ก่อนย้าย (28 ตัวตาม scout)
- [ ] Step 2: สร้าง useVenueSearch (ย้าย 125-221 + pickOrigin/pickMood/toggleFilter) — `load` เดิม resolve pendingChat → เปลี่ยนเป็นยิง listener ที่ ChatPanel ลงทะเบียน
- [ ] Step 3: สร้าง ChatPanel (ย้าย 172-349 ส่วน chat ทั้งหมด + qConsumed 299-307) — พิมพ์ในแชทต้อง **ไม่** re-render การ์ด (พิสูจน์: `console.count` ชั่วคราวใน VenueCard ระหว่างพิมพ์ 10 ตัวอักษร → count ไม่ขยับ แล้วลบออก)
- [ ] Step 4: `VenueCard` ครอบ `React.memo` + callback จาก PlannerClient ทำ stable (useCallback deps ถูกต้อง)
- [ ] Step 5: `wc -l app/app/planner-client.tsx` ≤ ~550 · check+build+journey + CDP: mood tile → chat "quiet cafe" → การ์ด highlight → add to plan ครบวง
- [ ] Step 6: commit `fe1.7: แตก planner — ChatPanel เป็นเจ้าของ chat state + useVenueSearch (พิมพ์แชทไม่ลาก re-render ทั้งหน้า)`

### Task 1.8: ลบของตาย

**Files:** Delete `components/IntentChips.tsx` · Modify `app/globals.css`

- [ ] Step 1: `grep -rn "IntentChips" app components lib tests` → 0 hits → ลบไฟล์
- [ ] Step 2: token กวาด: ทุก `--color-gn-*` ใน globals.css:22-68 — grep ชื่อ (ทั้งรูป `var(--color-gn-x)` และ utility `text-gn-x|bg-gn-x|border-gn-x`) ทั้ง app/ components/ → ลบเฉพาะตัวที่ 0 hits · **ห้ามลบ** `gn-amber-*` (T4.2 ใช้) และตัวที่มีผู้ใช้
- [ ] Step 3: ลบ `.gn-bob`/`@keyframes gn-bob` บล็อกแรก (globals.css:583-594) — เหลือชุด gn-bob2
- [ ] Step 4: check+build+journey (screenshot เทียบ baseline — ต้องไม่มีหน้าไหนเปลี่ยน) → commit `fe1.8: ลบ IntentChips + token ไร้ผู้ใช้ + keyframe ซ้ำ`

---

## Phase 2 — Journey & conversion

### Task 2.1: `MeProvider` — /api/me ครั้งเดียว + type เดียว

**Files:** Create `lib/me-context.tsx` · Modify: `lib/types.ts` (+`MeResponse` ฉบับเต็มจาก me/page.tsx:13-20), `app/app/me/page.tsx`, `app/shell.tsx` (ลบ MeResponse local 26-29 + fetch 86-90), `app/app/planner-client.tsx` (last-trip card 358-380 อ่าน context)

**Interfaces — Produces:**
```tsx
// lib/me-context.tsx — โหลด /api/me ครั้งเดียวต่อ shell mount แชร์ทุกหน้า
"use client";
import { createContext, useContext } from "react";
import { useApiResource } from "./use-api-resource";
import type { MeResponse } from "./types";

const MeCtx = createContext<{ me: MeResponse | null; reload: () => void }>({ me: null, reload: () => {} });
export const useMe = () => useContext(MeCtx);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const { data, reload } = useApiResource<MeResponse>("/api/me");
  return <MeCtx.Provider value={{ me: data, reload }}>{children}</MeCtx.Provider>;
}
```

- [ ] Step 1: ย้าย `MeResponse` ฉบับเต็ม → lib/types.ts · สร้าง me-context · mount ใน Shell (ใน ToastProvider)
- [ ] Step 2: shell (LIVE pill/Taste DNA), me page, planner last-trip card → อ่านจาก `useMe()` · me page หลัง mutation (save/wipe/delete) เรียก `reload()`
- [ ] Step 3: CDP Network: เปิด /app → `/api/me` ยิง **1** ครั้ง (เดิม 2) · check+build+journey → commit `fe2.1: MeProvider — /api/me ครั้งเดียว + MeResponse type เดียว`

### Task 2.2: Bottom tab bar มือถือ (ปิด P0)

**Files:** Create `components/BottomTabBar.tsx` · Modify `app/shell.tsx` (TABS/isActive export หรือย้ายไป `lib/nav.ts` + mount + main padding), `app/app/planner-client.tsx` (sticky budget bar offset)

**Interfaces — Produces:**
```tsx
// components/BottomTabBar.tsx — nav มือถือ < sm (การตัดสินใจ Klao ข้อ 1)
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "@/lib/nav";   // ย้าย TABS+isActive จาก shell ไป lib/nav.ts กัน import วน

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[110] flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} aria-current={isActive(pathname, t) ? "page" : undefined}
          className={`flex-1 py-2.5 text-center text-[12px] ${isActive(pathname, t) ? "font-semibold text-accent" : "text-mut"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
```
(label ใน TABS มี emoji นำอยู่แล้ว ใช้ตามเดิม · `isActive` signature ตามของจริง shell:19-24 · ชื่อคลาสสี `text-accent` เช็คกับ token จริง)

- [ ] Step 1: ย้าย TABS+isActive → lib/nav.ts · สร้าง BottomTabBar · mount ใน Shell · `<main>` เพิ่ม `pb-16 sm:pb-0`
- [ ] Step 2: sticky mobile budget bar (portal, planner:1093-1114, `bottom-[26px]`) → `bottom-[calc(64px+env(safe-area-inset-bottom))] sm:bottom-[26px]` — CDP 390px ดูว่าไม่ทับ tab bar
- [ ] Step 3: journey เพิ่ม step: `{ name: "mobile-tabbar", url: "/app", width: 390, expr: '!!document.querySelector("nav[aria-label=\\"Main\\"] a[href=\\"/app/explore\\"]")' }`
- [ ] Step 4: check+build+journey → commit `fe2.2: bottom tab bar — มือถือเข้าครบ 4 แท็บ (ปิด P0 nav)`

### Task 2.3: กัน active trip ซ้อน + banner ต่อทริป

**Files:** Create `lib/plan-rules.ts` · Modify: `app/api/plans/[id]/route.ts` (case "start" 58-60), `app/app/planner-client.tsx` (banner + 409 handling), `tests/logic.test.ts` (+3 tests)

**Interfaces — Produces:**
```ts
// lib/plan-rules.ts — กติกา plan ล้วนๆ ทดสอบได้ไม่ต้องมี store
import type { Plan } from "./types";
export function findBlockingActive(plans: Plan[], targetId: string): Plan | null {
  return plans.find((p) => p.status === "active" && p.id !== targetId) ?? null;
}
```
- server `case "start"`: โหลด plans ของ user (วิธีเดียวกับที่ /api/me ใช้ — ดู app/api/me/route.ts) → `findBlockingActive` เจอ → `409 { error: "already_active", activePlanId }`
- client: start เจอ 409 → toast "You already have a trip in progress" + ลิงก์ plan เดิม · /app banner "Continue your trip in progress →" เหนือ mood tiles เมื่อ `useMe()` มี active plan (ทรงเดียว memory card 585-606)

- [ ] Step 1 (TDD): +3 tests ใน logic.test.ts: มี active อื่น → เจอ / target ตัวเองเป็น active → null / ไม่มี active → null — รันให้แดง
- [ ] Step 2: plan-rules.ts → เขียว · ต่อ server 409 + client banner/toast
- [ ] Step 3: check (81) + build + journey · CDP: start ทริปที่สอง → toast ไม่ใช่ทริปซ้อน → commit `fe2.3: กัน active trip ซ้อน (409 + banner ต่อทริป)`

### Task 2.4: POST /api/plans คืน ExpandedPlan — ตัด GET ตามหลัง

**Files:** Modify `app/api/plans/route.ts:61`, `app/app/planner-client.tsx:454-458`

- [ ] Step 1: server: `return NextResponse.json(await expandPlan(plan))` (lib/server.ts:79 — plan ที่ save แล้ว)
- [ ] Step 2: client `addToPlan`: `const p = await gn<ExpandedPlan>("/api/plans", { method: "POST", ... }); setPlan(p);` — ลบ GET ตามหลัง
- [ ] Step 3: check+build+journey → commit `fe2.4: POST /api/plans คืน ExpandedPlan — add to plan เหลือ round-trip เดียว`

### Task 2.5: error.tsx + not-found.tsx + loading.tsx ในแบรนด์

**Files:** Create `app/error.tsx`, `app/not-found.tsx`, `app/app/loading.tsx` · Modify `app/app/page.tsx:6`

```tsx
// app/error.tsx — error boundary ทั้งแอปในแบรนด์ (คู่กับ client_error reporter เดิมใน Shell)
"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl">🛬</p>
      <h1 className="o-serif text-[22px] font-medium text-ink">Something went off-route</h1>
      <p className="text-sm text-mut">The error is on us — your plan data is safe.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="gn-press o-pill-primary o-btn-label px-5 py-2.5 text-sm">Try again</button>
        <a href="/app" className="gn-press o-pill-dark o-btn-label px-5 py-2.5 text-sm">Back to planner</a>
      </div>
    </main>
  );
}
```
```tsx
// app/not-found.tsx
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="o-serif text-[40px] font-medium text-ink">404</p>
      <p className="text-sm text-mut">This page isn&apos;t on the itinerary.</p>
      <Link href="/app" className="gn-press o-pill-primary o-btn-label px-5 py-2.5 text-sm">Back to planner</Link>
    </main>
  );
}
```
```tsx
// app/app/loading.tsx
import { SkeletonPage } from "@/components/LoadingSkeleton";
export default function Loading() { return <SkeletonPage />; }
```
(ตรวจ import alias จริง — ถ้า repo ใช้ relative import ให้ตาม convention เดิม · คลาสปุ่ม/สีลอกจากปุ่มจริงในแอป)

- [ ] Step 1-2: สร้าง 3 ไฟล์ + Suspense fallback ใน app/app/page.tsx:6 → `<SkeletonPage />`
- [ ] Step 3: journey `share-bad-404` ปรับ assert เป็นเนื้อ branded ("Back to planner") · CDP: /app/nonexistent → 404 ในแบรนด์
- [ ] Step 4: check+build+journey → commit `fe2.5: error/404/loading ในแบรนด์ — ไม่มีทางหลุดออกนอก shell`

### Task 2.6: จังหวะ conversion 4 จุดเล็ก

**Files:** Modify `app/app/plan/[id]/done-view.tsx`, `app/p/[id]/page.tsx:98`, `app/app/planner-client.tsx` (unseen note col2), `components/VenueCard.tsx:150-154`

- [ ] Step 1: DoneView ท้าย summary: `<Link href="/app" className="gn-press o-pill-primary o-btn-label mt-4 inline-block px-6 py-3 text-sm">Plan another day →</Link>`
- [ ] Step 2: p/[id]:98 `href="/"` → `href="/app"` (ข้อความปุ่มเดิม)
- [ ] Step 3: planner col2 เมื่อ `data.unseenPoolEmpty`: `<p className="text-[12px] text-mut">No confirmed Unseen gem for this combo yet — showing our next best Hit.</p>` (field มีใน VenuesResponse interface แล้ว — planner:113)
- [ ] Step 4: Watch clip: `<button onClick={() => window.open(venue.video_url!, "_blank", "noopener,noreferrer")} ...>` — ปุ่มตายกลายเป็นของจริง
- [ ] Step 5: check+build+journey → commit `fe2.6: done CTA + share CTA เข้าแอปตรง + unseen-gem note + watch clip ใช้ได้จริง`

### Task 2.7: Drafts แยกจาก Past trips + DELETE /api/plans/[id]

**Files:** Modify `app/api/plans/[id]/route.ts` (+DELETE), `lib/store.ts` + `lib/store-json.ts` + `supabase/store-adapter.ts` (+`deletePlan(id)` — เช็คก่อนว่ายังไม่มี), `app/app/me/page.tsx:370-408`, `tests/infra.test.ts` (+1)

- [ ] Step 1 (TDD): infra test `store-json: deletePlan ลบเฉพาะ id ที่ขอ` (pattern GN_DATA_FILE temp เดิม) — แดงก่อน
- [ ] Step 2: `deletePlan` ใน facade + 2 backends (supabase: `delete().eq("id", ...)`) → เขียว
- [ ] Step 3: DELETE handler — ลอก ownership check จาก GET (17-23): ไม่ใช่เจ้าของ → 404 · ลบได้เฉพาะ `status === "draft"` (active/done → 400 กันลบประวัติจริง) → `{ ok: true }`
- [ ] Step 4: me page: "Past trips" เฉพาะ active/done · กลุ่มพับ `<details>` "Drafts (N)" + ปุ่มลบรายตัว (toast ยืนยัน + `reload()` ของ useMe)
- [ ] Step 5: check+build+journey → commit `fe2.7: drafts แยกกลุ่ม + ลบรายตัว (DELETE เฉพาะ draft, owner เท่านั้น)`

### Task 2.8: ลำดับมือถือใหม่ + แชทยุบ (การตัดสินใจ Klao ข้อ 2)

**Files:** Modify `app/app/planner-client.tsx` (order คลาส 633/803/922), `components/ChatPanel.tsx` (collapsible)

- [ ] Step 1: มือถือ: col2 (การ์ด) `order-1`, col1 (แชท/เงื่อนไข) `order-2`, col3 `order-3` — desktop `lg:order-none` grid เดิมเป๊ะ
- [ ] Step 2: ChatPanel < lg: default ยุบเป็นแถบ `💬 Chat with GoNai — tell it what you feel like` กดขยาย/ยุบ (`aria-expanded`) · มาจาก `/app?q=` (initialQuery) → เปิดอัตโนมัติ · ≥ lg เต็มตามเดิมเสมอ
- [ ] Step 3: journey: step ใหม่ 390px — การ์ดร้านมาก่อนแชทในลำดับ DOM/viewport · CDP ดูจริง
- [ ] Step 4: check+build+journey → commit `fe2.8: มือถือเห็นการ์ดก่อน — แชทยุบเก็บ เปิดอัตโนมัติเมื่อมาจาก AskBar`

---

## Phase 3 — Accessibility

### Task 3.1: Keyboard + dialog semantics (explore video + focus trap)

**Files:** Create `lib/use-focus-trap.ts` · Modify `app/app/explore/page.tsx` (276-294, 317-340), `components/VenueSuggestSheet.tsx`

```ts
// lib/use-focus-trap.ts — วน Tab ใน dialog + คืน focus ให้ตัวเปิดตอนปิด
"use client";
import { useEffect, useRef } from "react";

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [active]);
  return ref;
}
```

- [ ] Step 1: explore thumbnail `<div onClick>` (276) → `<button>` จริง (คงหน้าตา + `text-left w-full`) · modal (317-340): `role="dialog" aria-modal="true" aria-label="Creator clip"` + Esc + useFocusTrap
- [ ] Step 2: VenueSuggestSheet ใช้ useFocusTrap (แทน `ref={(el) => el?.focus()}` — Esc มีแล้ว)
- [ ] Step 3: CDP `Input.dispatchKeyEvent`: เปิด clip ด้วย Enter, Tab วนใน sheet, Esc คืน focus → commit `fe3.1: keyboard เปิด clip ได้ + focus trap/restore ใน dialog ทั้งคู่`

### Task 3.2: Semantics + labels ทั้งแอป

**Files:** Modify: `app/app/planner-client.tsx`, `components/ChatPanel.tsx`, `components/LoadingSkeleton.tsx`, `components/VenueCard.tsx:67-82`, `components/WaitlistForm.tsx`, `app/app/plan/[id]/plan-shared.tsx`+views, `app/app/explore/page.tsx:137-151`

- [ ] Step 1: /app: `<h1 className="sr-only">Plan your day</h1>` บนสุด PlannerClient · `gn-step` 01/02/03 (634/804/923) `<span>` → `<h2>` คลาสเดิมเป๊ะ
- [ ] Step 2: ChatPanel message list: `role="log" aria-live="polite" aria-relevant="additions"`
- [ ] Step 3: LoadingSkeleton ทุก variant: `role="status" aria-live="polite"` + `<span className="sr-only">Loading…</span>`
- [ ] Step 4: aria-pressed: filter chips (762-779), intent chips (855-877), origin chips (820-853), mood tiles (608-628) · explore filter tabs (137-151) + plan/trip toggle → `aria-current` · Save: `aria-pressed={saved}` + label `saved ? "Remove from saved" : "Save"`
- [ ] Step 5: aria-label inputs: WaitlistForm ("LINE ID or email"), SpendInput ("Amount paid in baht"), budget edit ×2 ("New budget in baht"), price confirm ("Price per person in baht") · WaitlistForm success `role="status"` / error `role="alert"`
- [ ] Step 6: CDP กวาดทุกหน้า: `document.querySelectorAll('input:not([aria-label])').length` — ทุก input ที่เหลือต้องมี label จริงผูกอยู่ · check+build+journey → commit `fe3.2: heading/live-region/aria-pressed/labels ครบทุกหน้า`

### Task 3.3: Motion + touch targets

**Files:** Modify `app/globals.css` (693-725), `components/VenueCard.tsx:83-89`, `app/app/planner-client.tsx:597-604`

- [ ] Step 1: ใน list `animation: none !important` (globals:710-714 — `.gn-bump, .gn-ripple-once, ...`) เพิ่ม `.gn-chat-hl` และ `.gn-burst i`
- [ ] Step 2: route-toggle pill `py-1` → `py-1.5` · Dismiss ✕ memory card เพิ่ม `p-1.5`
- [ ] Step 3: CDP emulate reduced-motion → chat highlight/heart burst นิ่ง · getBoundingClientRect สองปุ่ม ≥ 24px · check+build+journey → commit `fe3.3: reduced-motion ครบ 15 ท่า + touch targets ≥ 24px`

---

## Phase 4 — Visual consistency

### Task 4.1: สี/token ที่ drift

**Files:** Modify `app/globals.css` (:root 80), `components/TripRecap.tsx` (const MUT), `app/page.tsx:164`, `app/app/explore/page.tsx:162`, `components/VenueSuggestSheet.tsx`

- [ ] Step 1: globals :root: `--mut: #70746e` → `--mut: var(--color-mut)` · TripRecap `MUT` `#70746e` → `#63675f`
- [ ] Step 2: page.tsx:164 inline gradient → `style={{ background: "var(--gn-brand-grad)" }}`
- [ ] Step 3: explore:162 `style={{ background: "#f7f7f4" }}` → คลาส `bg-bg-elev`
- [ ] Step 4: VenueSuggestSheet: `shadow-2xl` → `shadow-[var(--gn-shadow-3)]`
- [ ] Step 5: gen recap PNG ผ่าน CDP → เทาบนการ์ดตรงกับหน้าจอ · check+build+journey → commit `fe4.1: เทา mut เฉดเดียว + gradient/พื้น/เงา ตรง token (การ์ดแชร์สีตรงจอแล้ว)`

### Task 4.2: Typography + pattern เดียว

**Files:** Modify `app/globals.css` (+`.gn-warn-banner`), `app/app/welcome/page.tsx:42`, `app/app/group/page.tsx:20`, `app/app/explore/page.tsx:129`, `app/p/[id]/page.tsx:51`, warn banner 5 จุด (ใน plan-view/trip-view หลัง T1.5 — เดิม 298,311,373 · planner 670,1027), icon rows (page.tsx:108,154 · group:28), explore:283-288

- [ ] Step 1: h1 มาตรฐาน `text-[22px] font-medium`: welcome (เดิม 26px/semibold), group+explore (เดิม 24px/medium), p/[id] (เดิม 22px/semibold) — ส่วนอื่นของคลาสคงไว้
- [ ] Step 2: globals เพิ่ม:
```css
/* ===== warn banner — ทรงเดียวทั้งแอป (เดิม 4 radius 2 พื้น) ===== */
.gn-warn-banner {
  border: 1px solid var(--color-gn-amber-bd, #ecd9b0);
  background: var(--color-gn-amber-bg, #fdf6ec);
  border-radius: 12px;
}
```
(ค่า border/bg ตรวจกับ token `gn-amber-*` จริงใน globals — ถ้าโดนลบพลาดใน T1.8 ให้กู้กลับ · สี text warn ของเดิมคงที่ call site) · แทน 5 จุด + ตัด radius/พื้น hardcode เดิม
- [ ] Step 3: icon list rows → `text-2xl` ทั้ง 3 จุด · YouTube `<img>` + `loading="lazy" decoding="async"`
- [ ] Step 4: check+build+journey + screenshot จุดที่แก้ → commit `fe4.2: h1 ขนาดเดียว + gn-warn-banner + icon size + lazy thumbs`

### Task 4.3: Motion ให้ทั่วถึง

**Files:** Create `lib/use-reveal.ts`, `components/Reveal.tsx` · Modify `app/page.tsx` (107, 122-135, 152-157), `app/app/explore/page.tsx` (venue grid), `app/app/group/page.tsx` (feature cards), `app/p/[id]/page.tsx` (recap card)

```ts
// lib/use-reveal.ts — เติมคลาสเมื่อ element เข้าจอ (gn-rise เล่นตอน scroll ถึง ไม่ใช่ตอน mount)
"use client";
import { useEffect, useRef } from "react";

export function useReveal<T extends HTMLElement>(cls = "gn-rise") {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.opacity = "0";
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = ""; el.classList.add(cls); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [cls]);
  return ref;
}
```
```tsx
// components/Reveal.tsx — client wrapper ให้ landing (server component) ใช้ useReveal ได้
"use client";
import { useReveal } from "@/lib/use-reveal";
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref}>{children}</div>;
}
```

- [ ] Step 1: landing: ครอบ Problem grid / How-it-works / Features ด้วย `<Reveal>` — hero เดิมไม่แตะ
- [ ] Step 2: explore venue grid + group feature cards + p/[id] recap card: เติม `gn-rise` (+ `gn-d1/gn-d2` stagger ตาม pattern planner)
- [ ] Step 3: reduced-motion → ทุกอย่างนิ่ง (useReveal ข้าม + gn-rise อยู่ใน media block แล้ว) · check+build+journey → commit `fe4.3: motion ครบทุกหน้า + landing reveal ตอน scroll`

---

## Phase 5 — Verification

### Task 5.1: กวาดทั้งแอป + ปิดเอกสาร

- [ ] Step 1: `npm run check` (คาด 82: 78 + plan-rules 3 + deletePlan 1) + `npm run build` + `GN_QA_RUN=after-sweep npm run journey` เขียวหมด
- [ ] Step 2: เทียบ screenshot `design/qa/after-sweep/` กับ `baseline-2026-07-26/` ทีละหน้า — ทุก diff ต้องชี้ได้ว่ามาจาก task ไหน · diff อธิบายไม่ได้ = บั๊ก แก้ก่อนปิด
- [ ] Step 3: keyboard-only ผ่าน CDP: mood tile → add to plan → start → checkin → done ครบวงไม่ใช้เมาส์ · reduced-motion spot check
- [ ] Step 4: อัพเดต `PLAN.md`: file tree (hooks/providers/views/journey ใหม่), จำนวน test, ย่อหน้าสรุป "Frontend sweep 2026-07-26"
- [ ] Step 5: commit `fe5.1: verification sweep + PLAN.md` · `git status` สะอาด

### Task 6.1 (ปิดท้าย — Klao gate): Hairline compare

- [ ] Step 1: แก้ `--color-line: #e3e3dd` → `#c9c9c1` (globals @theme บรรทัด 11) และ `--line` (บรรทัด 78) **ชั่วคราว**
- [ ] Step 2: CDP screenshot ก่อน/หลัง 3 หน้า (/app, /app/plan draft, landing) @ 390+1280 → `design/qa/hairline-compare/`
- [ ] Step 3: **revert** (`git checkout app/globals.css`) — **ห้าม commit ค่าใหม่** · รายงาน path รูปให้ orchestrator เอาไปให้ Klao ตัดสิน (อนุมัติแล้วค่อย commit แยกทีหลัง)

## Self-review notes (ผู้เขียนแผนตรวจแล้ว)

- ทุก task มี commit + เกณฑ์ผ่านชัด · ไม่มี TBD — จุดที่ให้ worker ตัดสินจากไฟล์จริงถูกระบุเป็นกติกาใน Global Constraints
- ลำดับ dependency: 1.2→2.1 (provider ซ้อนใน Shell), 1.3→2.1, 1.4→1.5, 1.5→2.6/4.2 (views), 1.6→3.1/4.1 (VenueSuggestSheet), 1.7→2.8/3.2 (ChatPanel) — ห้ามสลับข้าม phase
- ปลายทางคาดหวัง: test 82 (logic 46 · infra 22 · pipeline 14) + journey ~15 steps · commits ~24 + hairline รอ Klao
