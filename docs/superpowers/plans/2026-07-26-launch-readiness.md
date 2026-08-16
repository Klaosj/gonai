# GoNai Launch-Readiness Improvement Plan (2026-07-26)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปิดงานค้าง v0.8 + ปิดช่องโหว่ W2 data pipeline + hygiene ก่อน deploy จริง — ทุกอย่างที่ agent ทำได้โดยไม่ต้องรอ Klao (งานที่เหลือของ Klao: สร้างโปรเจค Supabase, deploy, LINE console, W2 field sprint)

**Architecture:** ไม่มีสถาปัตยกรรมใหม่ — 4 งานอิสระบน codebase เดิม: (1) verify+commit งาน typography v0.8 ที่ค้าง, (2) เติม routes ให้ CSV→fixtures generator (ตอนนี้ output ไม่มี `export const ROUTES` ทำให้ `lib/catalog.ts` compile ไม่ผ่านถ้าใช้จริง), (3) ถอด dependency ที่ไม่ได้ใช้, (4) สคริปต์ preflight ตรวจ env ก่อน deploy

**Tech Stack:** Next.js 15 + React 19 + Tailwind v4 + tsx test scripts (ไม่มี vitest/jest — harness เป็น `test()`/`eq()` เขียนเองในไฟล์ test)

## Global Constraints

- **Repo:** `/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/GoNai` — path มีช่องว่าง **ต้อง quote ทุกครั้ง** ใน shell (ย้ายจาก `Klao's Workspace/Code/gonai` 2026-08-12)
- **บั๊กเครื่อง dev ที่รู้อยู่:** webpack cache พังเพราะ apostrophe ใน path — ถ้า `npm run build`/dev ล้มด้วย `__webpack_modules__[moduleId] is not a function` หรือหน้า 500 → `rm -rf .next` แล้วรันใหม่ (ไม่ใช่บั๊กของโค้ด)
- **ห้ามเพิ่ม dependency ใดๆ** — test เป็น tsx script ล้วน, script ใหม่ใช้ node builtin เท่านั้น
- **ห้ามแตะ:** design tokens / ฟอนต์ (v0.8 เพิ่ง FINAL), dark mode (Klao สั่งข้าม), rate limit infra (PLAN.md: "ห้ามเพิ่ม infra จนกว่าตัวเลขจริงจะเถียง")
- **ภาษา:** ข้อความใน UI เป็นอังกฤษ · comment/docs เป็นไทย (ตาม convention repo)
- **Commit ทีละ task** ข้อความไทยบรรทัดเดียวตามสไตล์ git log เดิม · **ห้าม push**
- ทุก test ใหม่ต้องรันผ่าน `npm run check` (wire เข้า script ใน package.json)
- Baseline ตอนเขียนแผน: `npm run check` เขียวทั้งหมด (logic + infra 17 ข้อ) · มีไฟล์แก้ค้าง 10 ไฟล์ของงาน v0.8 ที่ยังไม่ commit
- ถ้า hook `[Fact-Forcing Gate]` block คำสั่ง Bash/Write แรก → present facts ที่มันขอ แล้ว retry คำสั่งเดิม

---

### Task 1: Verify + commit งาน typography v0.8 ที่ค้างอยู่

งานทำเสร็จแล้ววันนี้ (2026-07-26) แต่ยังไม่ commit: ย้ายฟอนต์ทั้งแอปเป็น IBM Plex Sans Thai + IBM Plex Mono และแก้บั๊ก layout 5 จุดจาก QA กวาด 9 ความกว้าง — รายละเอียดบันทึกครบใน `PLAN.md` (หัวข้อ "ตัวอักษร v0.8" และ "บั๊ก layout ที่เจอตอน QA ฟอนต์") ห้ามแก้โค้ดเพิ่ม — งานนี้คือ verify แล้ว commit เท่านั้น

**Files:**
- Commit (แก้ไว้แล้ว ห้ามแตะเพิ่ม): `PLAN.md`, `app/app/explore/page.tsx`, `app/globals.css`, `app/layout.tsx`, `app/p/[id]/page.tsx`, `app/shell.tsx`, `components/Logo.tsx`, `components/TripRecap.tsx`, `design/PLAN-forest-theme.md`, `public/icon.svg`

**Interfaces:**
- Consumes: working tree ปัจจุบัน (10 modified files)
- Produces: commit ใหม่บน `main` · working tree สะอาดพร้อมให้ Task 2-4 ทำงานต่อ

- [ ] **Step 1: ยืนยันว่าไฟล์ที่แก้ตรงกับรายการ**

Run: `git status --short`
Expected: modified 10 ไฟล์ตามรายการข้างบน **เท่านั้น** — ถ้ามีไฟล์อื่นโผล่เพิ่ม (นอกจาก `docs/superpowers/plans/` ของแผนนี้) ให้หยุดแล้วรายงาน อย่า commit รวม

- [ ] **Step 2: รัน test ทั้งชุด**

Run: `npm run check`
Expected: ทุกข้อผ่าน 0 failed (logic + infra)

- [ ] **Step 3: รัน production build**

Run: `npm run build`
Expected: build สำเร็จ ไม่มี type error — ถ้าเจอ `__webpack_modules__` error ให้ `rm -rf .next` แล้วรันใหม่ก่อนสรุปว่าพัง

- [ ] **Step 4: Commit**

```bash
git add PLAN.md app/app/explore/page.tsx app/globals.css app/layout.tsx "app/p/[id]/page.tsx" app/shell.tsx components/Logo.tsx components/TripRecap.tsx design/PLAN-forest-theme.md public/icon.svg
git commit -m "typography v0.8 — IBM Plex Thai ทั้งแอป + แก้บั๊ก layout 5 จุดจาก QA กวาด 9 ความกว้าง"
```

---

### Task 2: W2 pipeline — เติม routes ให้ CSV→fixtures generator + end-to-end test

**บั๊กจริงที่ปิด:** `tests/csv-to-fixtures.ts` สร้าง `lib/fixtures.ts` ที่**ไม่มี** `export const ROUTES` (ค้างเป็น TODO comment) แต่ `lib/catalog.ts:5` import `ROUTES` จาก fixtures — ถ้า Klao รัน pipeline นี้หลัง W2 field sprint แอปทั้งตัว compile ไม่ผ่านทันที และไม่มี CSV template สำหรับเส้นทางเลยทั้งที่ W2 ต้องเก็บเส้นทางจริง 6 origins

**Files:**
- Create: `tests/routes-template.csv`
- Create: `tests/pipeline.test.ts`
- Modify: `tests/csv-to-fixtures.ts` (เพิ่ม routes + บังคับ 2 args + ลบ import ที่ไม่ได้ใช้)
- Modify: `package.json` (เพิ่ม pipeline test เข้า `check`)
- Modify: `.gitignore` (ไฟล์ temp ของ test)
- Modify: `PLAN.md` (หัวข้อ "คำสั่ง" + "W2 field sprint" + file tree)

**Interfaces:**
- Consumes: `lib/types.ts` — `Route { id, origin_zone, dest_zone, kind: "cheapest"|"fastest", legs: RouteLeg[] }`, `RouteLeg { route_id, seq, mode, detail_th, price_min, price_max, minutes, warning_th }`
- Produces: คำสั่งใหม่ `tsx tests/csv-to-fixtures.ts <venues.csv> <routes.csv> > lib/fixtures.ts` — output มี exports ครบ: `ZONES`, `VENUES`, `ROUTES`, `BUDGET_DEFAULTS`, `LAUNCH_ZONE`, `STALE_DAYS` · routes CSV schema: 1 แถว = 1 leg, group ด้วย `route_id`, เรียงด้วย `seq`

- [ ] **Step 1: เขียน test ก่อน (จะ fail)**

สร้าง `tests/pipeline.test.ts` ทั้งไฟล์:

```ts
// pipeline.test.ts — W2 CSV → lib/fixtures.ts pipeline (ครบวงจร)
// รันด้วย: npm run check (ต่อจาก infra.test.ts)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const eq = <T>(actual: T, expected: T, msg?: string) => {
  if (actual !== expected) {
    throw new Error(`${msg ?? "eq"}: expected ${expected}, got ${actual}`);
  }
};
const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};

// เขียนใน lib/ เพื่อให้ import "./types" ของไฟล์ generated resolve ได้
const TMP = path.join("lib", ".pipeline-tmp-fixtures.ts");

async function main() {
  console.log("pipeline.test.ts — W2 CSV → fixtures");

  const out = execFileSync(
    "node_modules/.bin/tsx",
    ["tests/csv-to-fixtures.ts", "tests/fixtures-template.csv", "tests/routes-template.csv"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  fs.writeFileSync(TMP, out);

  try {
    const mod = await import(pathToFileURL(path.resolve(TMP)).href);

    await test("generated fixtures import ได้และ exports ครบ", () => {
      ok(Array.isArray(mod.VENUES), "VENUES missing");
      ok(Array.isArray(mod.ROUTES), "ROUTES missing — บั๊กเดิมกลับมา");
      ok(Array.isArray(mod.ZONES), "ZONES missing");
      ok(!!mod.BUDGET_DEFAULTS && mod.LAUNCH_ZONE === "siam", "constants missing");
    });

    await test("จำนวน venue = จำนวนแถว data ใน CSV", () => {
      const rows = fs.readFileSync("tests/fixtures-template.csv", "utf8").trim().split("\n").length - 1;
      eq(mod.VENUES.length, rows);
    });

    await test("R001 มี 3 legs เรียงตาม seq", () => {
      const r = mod.ROUTES.find((x: { id: string }) => x.id === "R001");
      ok(!!r, "R001 not found");
      eq(r.legs.length, 3);
      eq(r.legs.map((l: { seq: number }) => l.seq).join(","), "1,2,3");
    });

    await test("ทุกเส้นทางจบที่ siam + kind ถูก + leg ผูก route_id ถูก", () => {
      ok(mod.ROUTES.length >= 4, "ต้องมีอย่างน้อย 4 เส้น (2 origins × 2 kinds)");
      for (const r of mod.ROUTES) {
        eq(r.dest_zone, "siam", r.id);
        ok(r.kind === "cheapest" || r.kind === "fastest", `${r.id} kind=${r.kind}`);
        for (const l of r.legs) eq(l.route_id, r.id, `${r.id} leg route_id`);
      }
    });

    await test("warning_th ว่างใน CSV → null (ไม่ใช่ empty string)", () => {
      const r = mod.ROUTES.find((x: { id: string }) => x.id === "R001");
      eq(r.legs[0].warning_th, null);
      eq(r.legs[1].warning_th, "Last boat 19:40");
    });

    await test("venue sanity: price min ≤ max ทุกที่", () => {
      for (const v of mod.VENUES) {
        ok(v.price_per_head_min <= v.price_per_head_max, v.id);
      }
    });

    await test("ไม่ส่ง routes.csv → exit non-zero (กัน fixtures ที่ compile ไม่ผ่าน)", () => {
      let code = 0;
      try {
        execFileSync(
          "node_modules/.bin/tsx",
          ["tests/csv-to-fixtures.ts", "tests/fixtures-template.csv"],
          { encoding: "utf8", stdio: "pipe" },
        );
      } catch (e) {
        code = (e as { status?: number }).status ?? 1;
      }
      ok(code !== 0, "should exit non-zero without routes csv");
    });
  } finally {
    fs.rmSync(TMP, { force: true });
  }

  console.log("═".repeat(60));
  console.log(`  ${pass} passed, ${fail} failed (${pass + fail} total)`);
  if (fail > 0) process.exit(1);
}

main();
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx tsx tests/pipeline.test.ts`
Expected: FAIL หลายข้อ — generator เก่าเมิน argv ตัวที่ 3 แล้วสร้าง output ที่ไม่มี ROUTES → อย่างน้อยข้อ "ROUTES missing" กับข้อ "exit non-zero" ต้อง fail (ถ้า fail เป็น 0 แปลว่า test เขียนผิด ให้หยุดตรวจ)

- [ ] **Step 3: สร้าง routes CSV template**

สร้าง `tests/routes-template.csv` (1 แถว = 1 leg · route_id ซ้ำ = เส้นเดียวกัน · เรียงด้วย seq · warning_th เว้นว่างได้ — ข้อมูลเป็น sample ให้ทีม field แทนด้วยของจริง):

```csv
route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,Win bike to Bang Kapi pier,20,20,10,
R001,bangkapi,siam,cheapest,2,boat,Saen Saep boat to Pratunam pier,27,27,33,Last boat 19:40
R001,bangkapi,siam,cheapest,3,walk,Walk into Siam,0,0,5,
R002,bangkapi,siam,fastest,1,grab,Grab from home to Siam,180,210,35,
R003,ladprao,siam,cheapest,1,walk,Walk to BTS Ha Yaek Lat Phrao,0,0,8,
R003,ladprao,siam,cheapest,2,bts,BTS to Siam,44,44,22,
R004,ladprao,siam,fastest,1,grab,Grab from home to Siam,150,180,30,
```

- [ ] **Step 4: แก้ generator**

ใน `tests/csv-to-fixtures.ts`:

4a. **ลบ** บรรทัด `import { parse } from "node:path";` (dead import — ไม่มีที่ไหนใช้)

4b. อัพเดต comment header ส่วนวิธีใช้เป็น:

```ts
// csv-to-fixtures.ts — แปลง CSV (W2 field sprint output) → lib/fixtures.ts
// วิธีใช้: tsx tests/csv-to-fixtures.ts <venues.csv> <routes.csv> > lib/fixtures.ts
// ตัวอย่าง: tsx tests/csv-to-fixtures.ts tests/fixtures-template.csv tests/routes-template.csv
//
// routes.csv: 1 แถว = 1 leg · คอลัมน์:
//   route_id, origin_zone, dest_zone, kind (cheapest|fastest), seq,
//   mode (walk|win|boat|bts|mrt|songthaew|van|grab), detail_th,
//   price_min, price_max, minutes, warning_th (เว้นว่าง = null)
```

(คง comment คอลัมน์ venues CSV เดิมไว้)

4c. เพิ่ม 2 ฟังก์ชันนี้ต่อจาก `venueToTS`:

```ts
function legTS(routeId: string, l: Record<string, string>): string {
  const warn = l.warning_th === "" ? "null" : s(l.warning_th);
  return `      { route_id: ${s(routeId)}, seq: ${Number(l.seq)}, mode: ${s(l.mode)} as RouteLeg["mode"], detail_th: ${s(l.detail_th)}, price_min: ${Number(l.price_min)}, price_max: ${Number(l.price_max)}, minutes: ${Number(l.minutes)}, warning_th: ${warn} },`;
}

function routesToTS(rows: Record<string, string>[]): string {
  const byId = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    const list = byId.get(r.route_id) ?? [];
    list.push(r);
    byId.set(r.route_id, list);
  }
  const out: string[] = [];
  for (const [id, legs] of byId) {
    legs.sort((a, b) => Number(a.seq) - Number(b.seq));
    const head = legs[0];
    out.push(`  {
    id: ${s(id)},
    origin_zone: ${s(head.origin_zone)},
    dest_zone: ${s(head.dest_zone)},
    kind: ${s(head.kind)} as Route["kind"],
    legs: [
${legs.map((l) => legTS(id, l)).join("\n")}
    ],
  },`);
  }
  return out.join("\n");
}
```

4d. แทนที่ `function main()` เดิมทั้งฟังก์ชันด้วย (ตัด stdin mode ทิ้ง — บังคับ 2 file args):

```ts
function readRows(filePath: string): Record<string, string>[] {
  const rows = parseCSV(fs.readFileSync(filePath, "utf8"));
  if (rows.length < 2) {
    console.error(`${filePath}: CSV must have header + at least 1 row`);
    process.exit(1);
  }
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

function main() {
  const venuesPath = process.argv[2];
  const routesPath = process.argv[3];
  if (!venuesPath || !routesPath) {
    console.error("Usage: tsx tests/csv-to-fixtures.ts <venues.csv> <routes.csv> > lib/fixtures.ts");
    console.error("routes.csv บังคับ — fixtures ที่ไม่มี ROUTES ทำให้ lib/catalog.ts compile ไม่ผ่าน");
    process.exit(1);
  }

  const venuesTS = readRows(venuesPath).map(venueToTS).join("\n");
  const routesTS = routesToTS(readRows(routesPath));

  const output = `// Fixtures — generated from CSV by tests/csv-to-fixtures.ts
// แหล่ง: W2 field sprint — ห้ามแก้มือ, รัน script ใหม่ทุกครั้งที่ CSV เปลี่ยน
import type { Badge, FoodLevel, Intent, Noise, Plugs, Route, RouteLeg, Venue, Zone } from "./types";

export const ZONES: Zone[] = [
  { id: "bangkapi", name_th: "บางกะปิ", is_origin: true, km_to_siam: 13 },
  { id: "ladprao", name_th: "ลาดพร้าว", is_origin: true, km_to_siam: 10 },
  { id: "onnut", name_th: "อ่อนนุช", is_origin: true, km_to_siam: 11 },
  { id: "pinklao", name_th: "ปิ่นเกล้า", is_origin: true, km_to_siam: 12 },
  { id: "chatuchak", name_th: "จตุจักร", is_origin: true, km_to_siam: 9 },
  { id: "bangna", name_th: "บางนา", is_origin: true, km_to_siam: 18 },
  { id: "siam", name_th: "สยาม", is_origin: false, km_to_siam: 0 },
];

export const VENUES: Venue[] = [
${venuesTS}
];

export const ROUTES: Route[] = [
${routesTS}
];

export const BUDGET_DEFAULTS: Record<Intent, number> = {
  work: 450,
  date: 900,
  family: 1200,
  photo: 600,
};

export const LAUNCH_ZONE = "siam";
export const STALE_DAYS = 45;
`;

  console.log(output);
}

main();
```

(หมายเหตุ: `RouteLeg` มีใน `lib/types.ts` แล้ว — แค่เพิ่มใน import line ของ output · ZONES ยังคง hard-code 6 origins + siam ตาม spec S1 — อย่าเปลี่ยนเป็น CSV, YAGNI)

- [ ] **Step 5: กันไฟล์ temp หลุดเข้า git**

เพิ่มบรรทัดนี้ท้าย `.gitignore`:

```
lib/.pipeline-tmp-fixtures.ts
```

- [ ] **Step 6: รัน test ให้ผ่าน**

Run: `npx tsx tests/pipeline.test.ts`
Expected: `7 passed, 0 failed (7 total)`

- [ ] **Step 7: wire เข้า npm run check**

ใน `package.json` แก้ script `check` เป็น:

```json
"check": "tsx tests/logic.test.ts && tsx tests/infra.test.ts && tsx tests/pipeline.test.ts"
```

Run: `npm run check`
Expected: ทั้ง 3 ไฟล์ผ่าน 0 failed

- [ ] **Step 8: อัพเดต PLAN.md**

- หัวข้อ "คำสั่ง": เพิ่ม/แก้เป็น `npx tsx tests/csv-to-fixtures.ts <venues.csv> <routes.csv> > lib/fixtures.ts   # W2 CSV → fixtures (venues + routes)`
- หัวข้อ "W2 field sprint": เพิ่มบรรทัด `- เส้นทางจริงกรอกใน routes CSV (1 แถว = 1 leg, ดู tests/routes-template.csv) — generator รวมเป็น ROUTES ให้`
- file tree: เพิ่ม `routes-template.csv` และ `pipeline.test.ts` ใต้ `tests/`

- [ ] **Step 9: Commit**

```bash
git add tests/routes-template.csv tests/pipeline.test.ts tests/csv-to-fixtures.ts package.json .gitignore PLAN.md
git commit -m "w2 pipeline: routes CSV → fixtures ครบวงจร + pipeline test 7 ข้อ (ปิด TODO ROUTES ที่ทำให้ catalog compile ไม่ผ่าน)"
```

---

### Task 3: ถอด zustand ที่ไม่ได้ใช้

`zustand` อยู่ใน dependencies แต่ grep ทั้ง `app/ components/ lib/ tests/` ไม่มีไฟล์ไหน import (state ทั้งแอปเป็น useState/useRef — PLAN.md บันทึกไว้แล้ว)

**Files:**
- Modify: `package.json` + `package-lock.json` (ผ่าน npm uninstall)
- Modify: `PLAN.md` (บรรทัด Tech)

**Interfaces:**
- Consumes: —
- Produces: dependencies สะอาด — ไม่มีสัญญาอะไรกับ task อื่น

- [ ] **Step 1: ยืนยันอีกครั้งว่าไม่มีใครใช้**

Run: `grep -rn "zustand" app components lib tests supabase scripts 2>/dev/null; echo "grep exit=$?"`
Expected: ไม่มีผลลัพธ์ (grep exit=1 แปลว่า no match) — ถ้ามี match ให้หยุดแล้วรายงาน

- [ ] **Step 2: ถอด**

Run: `npm uninstall zustand`
Expected: package.json ไม่มี zustand แล้ว

- [ ] **Step 3: ยืนยันแอปยังดี**

Run: `npm run check && npm run build`
Expected: tests ผ่านหมด + build สำเร็จ

- [ ] **Step 4: อัพเดต PLAN.md**

แก้บรรทัด Tech จาก

```
- **Tech**: Next.js 15 (App Router) + React 19 + Tailwind v4 (`zustand` อยู่ใน package.json แต่ยังไม่มีไฟล์ไหน import — state ทั้งแอปเป็น useState/useRef)
```

เป็น

```
- **Tech**: Next.js 15 (App Router) + React 19 + Tailwind v4 — state ทั้งแอปเป็น useState/useRef (ไม่มี state lib)
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json PLAN.md
git commit -m "chore: ถอด zustand — ไม่มีไฟล์ไหน import"
```

---

### Task 4: Preflight script ตรวจ env ก่อน deploy

ขั้น deploy จริงใน PLAN.md ต้องตั้ง env 4+ ตัวถูกครบ (`GN_AUTH_SECRET` บังคับใน production) — สคริปต์นี้ให้ Klao รันเช็คก่อนกด deploy แทนการไล่เช็คด้วยตา · **pure env check เท่านั้น ไม่ยิง network** (หลัง deploy มี `/api/health` ทำหน้าที่ live check อยู่แล้ว — อย่าทำซ้ำ)

**Files:**
- Create: `lib/preflight.ts` (pure function — testable)
- Create: `scripts/preflight.ts` (CLI wrapper)
- Modify: `package.json` (script `preflight`)
- Modify: `tests/infra.test.ts` (เพิ่ม 4 tests)
- Modify: `PLAN.md` (ขั้น deploy จริง + คำสั่ง + file tree)

**Interfaces:**
- Consumes: `process.env` เท่านั้น
- Produces: `preflightChecks(env: Record<string, string | undefined>): PreflightCheck[]` โดย `PreflightCheck = { name: string; ok: boolean; required: boolean; hint: string }` · คำสั่ง `npm run preflight` — exit 0 = required ผ่านหมด, exit 1 = ยังไม่พร้อม deploy

- [ ] **Step 1: เขียน test ก่อน (จะ fail)**

ใน `tests/infra.test.ts`: เพิ่ม import ที่ส่วนหัว

```ts
import { preflightChecks } from "../lib/preflight";
```

ถ้าไฟล์ยังไม่มี helper `ok` ให้เพิ่มถัดจาก `eq`:

```ts
const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};
```

แล้วเพิ่ม 4 tests นี้ต่อท้ายกลุ่ม test เดิม (ก่อนบรรทัดสรุป pass/fail — วางใน scope เดียวกับ test อื่นตามโครงสร้างไฟล์เดิม ถ้า test เดิมอยู่ใน async main ให้วางในนั้น):

```ts
const GOOD_ENV = {
  GN_AUTH_SECRET: "x".repeat(40),
  SUPABASE_URL: "https://abc123.supabase.co",
  SUPABASE_SERVICE_KEY: "k".repeat(30),
  NEXT_PUBLIC_BASE_URL: "https://gonai.example.com",
};

await test("preflight: env ว่าง → required fail ครบ 4 ตัว", () => {
  const c = preflightChecks({});
  eq(c.filter((x) => x.required && !x.ok).length, 4);
});

await test("preflight: env ครบถูก → required ผ่านหมด", () => {
  const c = preflightChecks(GOOD_ENV);
  eq(c.filter((x) => x.required && !x.ok).length, 0);
});

await test("preflight: secret สั้น หรือค่า default → ไม่ผ่าน", () => {
  const short = preflightChecks({ ...GOOD_ENV, GN_AUTH_SECRET: "short" });
  ok(!short.find((x) => x.name === "GN_AUTH_SECRET")!.ok, "สั้นต้องไม่ผ่าน");
  const dflt = preflightChecks({ ...GOOD_ENV, GN_AUTH_SECRET: "change-me-change-me-change-me-change-me" });
  ok(!dflt.find((x) => x.name === "GN_AUTH_SECRET")!.ok, "ขึ้นต้น change-me ต้องไม่ผ่าน");
});

await test("preflight: LINE ตั้งครึ่งเดียว → เตือน (ไม่นับ required)", () => {
  const c = preflightChecks({ ...GOOD_ENV, LINE_CHANNEL_ID: "123" });
  const line = c.find((x) => x.name === "LINE_CHANNEL_ID/SECRET")!;
  ok(!line.ok && !line.required, "half-set ต้อง warn แบบไม่ block");
});
```

- [ ] **Step 2: รันให้เห็นว่า fail**

Run: `npx tsx tests/infra.test.ts`
Expected: FAIL — `Cannot find module '../lib/preflight'`

- [ ] **Step 3: เขียน `lib/preflight.ts`**

```ts
// preflight.ts — ตรวจความพร้อม env ก่อน deploy production
// pure function ล้วน ไม่แตะ network — live check หลัง deploy ใช้ /api/health
export type PreflightCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  hint: string;
};

export function preflightChecks(env: Record<string, string | undefined>): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  const secret = env.GN_AUTH_SECRET ?? "";
  checks.push({
    name: "GN_AUTH_SECRET",
    ok: secret.length >= 32 && !secret.startsWith("change-me"),
    required: true,
    hint: "สร้างด้วย: openssl rand -base64 32 (ต้อง ≥32 ตัวอักษร)",
  });

  checks.push({
    name: "SUPABASE_URL",
    ok: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL ?? ""),
    required: true,
    hint: "URL โปรเจค Supabase เช่น https://xxxx.supabase.co",
  });

  checks.push({
    name: "SUPABASE_SERVICE_KEY",
    ok: (env.SUPABASE_SERVICE_KEY ?? "").length > 20,
    required: true,
    hint: "service role key จาก Supabase dashboard",
  });

  checks.push({
    name: "NEXT_PUBLIC_BASE_URL",
    ok: (env.NEXT_PUBLIC_BASE_URL ?? "").startsWith("https://"),
    required: true,
    hint: "โดเมนจริงขึ้นต้น https:// (ใช้สร้าง LINE callback URL)",
  });

  const lineId = env.LINE_CHANNEL_ID ?? "";
  const lineSecret = env.LINE_CHANNEL_SECRET ?? "";
  checks.push({
    name: "LINE_CHANNEL_ID/SECRET",
    ok: !!lineId === !!lineSecret,
    required: false,
    hint: "ตั้งคู่กันหรือไม่ตั้งเลย — ตั้งครึ่งเดียว = login พังแบบเงียบ",
  });

  checks.push({
    name: "ANTHROPIC_API_KEY",
    ok: !!env.ANTHROPIC_API_KEY,
    required: false,
    hint: "ไม่ตั้ง = chat ใช้ quick parser (ใช้ได้ แต่ฉลาดน้อยกว่า)",
  });

  return checks;
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx tsx tests/infra.test.ts`
Expected: PASS ทั้งหมด (17 ข้อเดิม + 4 ใหม่ = 21)

- [ ] **Step 5: เขียน CLI + npm script**

สร้าง `scripts/preflight.ts`:

```ts
// preflight CLI — รันก่อน deploy: npm run preflight
// ตั้ง env ให้เหมือนที่จะใช้บน host แล้วรัน (อ่านจาก process.env ตรงๆ)
import { preflightChecks } from "../lib/preflight";

const checks = preflightChecks(process.env);
let failed = 0;

console.log("GoNai preflight — ตรวจ env สำหรับ production\n");
for (const c of checks) {
  const mark = c.ok ? "✓" : c.required ? "✗" : "⚠";
  if (!c.ok && c.required) failed++;
  console.log(`  ${mark} ${c.name}${c.ok ? "" : ` — ${c.hint}`}`);
}

if (failed > 0) {
  console.error(`\n${failed} required check(s) failed — ยังไม่พร้อม deploy`);
  process.exit(1);
}
console.log("\npreflight ผ่าน — พร้อม deploy (หลัง deploy อย่าลืมผูก /api/health กับ UptimeRobot)");
```

ใน `package.json` เพิ่ม script:

```json
"preflight": "tsx scripts/preflight.ts"
```

- [ ] **Step 6: ลองรันจริง**

Run: `npm run preflight`
Expected: exit 1 พร้อมรายการ ✗ (เครื่อง dev ไม่มี prod env — ถูกต้องตามคาด · หมายเหตุ: tsx ไม่โหลด .env ให้เอง — อ่านเฉพาะ env ที่ตั้งใน shell)

Run: `GN_AUTH_SECRET=$(openssl rand -base64 32) SUPABASE_URL=https://abc.supabase.co SUPABASE_SERVICE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx NEXT_PUBLIC_BASE_URL=https://gonai.example.com npm run preflight`
Expected: exit 0 — "preflight ผ่าน"

- [ ] **Step 7: อัพเดต PLAN.md**

- หัวข้อ "ขั้น deploy จริง (เหลือทำ)": เพิ่มขั้น 0 ก่อนขั้น 1 เดิม: `0. npm run preflight (ตั้ง env เหมือน production แล้วรัน — ผ่านค่อยไปต่อ)`
- หัวข้อ "คำสั่ง": เพิ่ม `npm run preflight                  # ตรวจ env ก่อน deploy`
- file tree: เพิ่ม `lib/preflight.ts` และ `scripts/preflight.ts`

- [ ] **Step 8: รัน check ทั้งชุด + Commit**

Run: `npm run check`
Expected: ผ่านหมดทุกไฟล์

```bash
git add lib/preflight.ts scripts/preflight.ts tests/infra.test.ts package.json PLAN.md
git commit -m "preflight: npm run preflight ตรวจ env ครบก่อน deploy + test 4 ข้อ"
```

---

## หลังจบทุก task

- `git status` ต้องสะอาด (เหลือได้แค่ `docs/superpowers/plans/` ของแผนนี้ — commit แยกเป็น `docs: launch-readiness plan 2026-07-26`)
- `git log --oneline -6` เห็น commits ใหม่ครบทุก task
- `npm run check` เขียวทั้งหมด (logic + infra 21 + pipeline 7)
- **ห้าม push**
- งานที่เหลือเป็นของ Klao (นอกขอบเขตแผนนี้ — อยู่ใน PLAN.md "ขั้น deploy จริง"): สร้างโปรเจค Supabase + รัน schema.sql + seed, ตั้ง env บน host แล้วรัน `npm run preflight`, deploy, ตั้ง LINE callback, W2 field sprint (ตอนนี้ pipeline พร้อมรับ CSV ทั้ง venues และ routes แล้ว)
