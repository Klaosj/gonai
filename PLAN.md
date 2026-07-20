# GoNai — MVP Build Plan

> แผนการทำงานรวม ดึงจาก inline specs ในโค้ด (lib/, app/api/, app/app/) มารวมที่เดียว
> อ้างอิง: MVP Build Spec v1.0

## ภาพรวมโปรเจค

แอปวางแผนเที่ยว 1 วัน พร้อมค่าเดินทาง+งบทุกบาท ก่อนออกจากบ้าน เน้นย่านสยามเป็น launch zone

- **Tech**: Next.js 15 (App Router) + React 19 + Tailwind v4 + Zustand
- **UI**: Mobile-first (max-w-md), ไทยล้วน, IBM Plex Sans Thai
- **Design tokens** (ห้ามเปลี่ยน — spec 2.7):
  - `--gn-orange: #f25c05` / `--gn-orange-dark: #d14e04` (CTA primary)
  - `--gn-navy: #1a2238` (text + header) / `--gn-cream: #faf6f0` (bg)
  - `--gn-green: #1e7f4f` (under budget) / `--gn-red: #c6362c` (over budget)
  - `--gn-purple: #6b4fa0` (unseen badge) / `--gn-gray: #8a8578`

## สถานะปัจจุบัน (2026-07-20)

- [x] Flow 5 หน้าจอครบ (S1-S5)
- [x] API 7 endpoints ครบ (me, saves, imports, events, chain, plans, plans/[id], venues)
- [x] Pure functions: costing, budget, top3, chaining
- [x] QA 10 รอบผ่าน ไม่มี logic bug (ดู `QA-RESULTS.md`)
- [x] แก้บั๊ก 3 ข้อจาก QA (input validation + UX empty state)
- [x] Integration tests 32 รอบผ่าน (`npm run check`)
- [x] PLAN.md รวม (ไฟล์นี้)
- [x] W2 CSV template + import script (`tests/fixtures-template.csv` + `tests/csv-to-fixtures.ts`)
- [x] PaiNai v0.3 UI — 4 แท็บ (วางแผน/สำรวจ/กลุ่ม/ทริปของฉัน) + design tokens ใหม่ (green/orange/purple) + 3 คอลัมน์ planner
- [x] Landing page (PART B) — `app/page.tsx` (hero + problem + 3 ขั้นตอน + features + CTA)
- [x] Supabase migration — `supabase/schema.sql` (6 ตาราง + RLS) + `supabase/store-adapter.ts` (async adapter) + `.env.example`
- [x] LINE Login v1.1 — `lib/auth.ts` + `app/api/auth/line/callback/route.ts` + `app/api/auth/line/logout/route.ts` (พร้อมใช้ทันทีที่ตั้ง env)
- [x] W2 field sprint — `tests/w2-seed.ts` (40 venues + 16 routes, จำลองข้อมูลจริงสำหรับ staging)

## Flow 5 หน้าจอ (spec 2.8)

```
S1 /app               S2 /app/results        S3 /app/plan/[id]      S4 /app/trip/[id]      S5 /app/me
┌─────────────┐      ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ intent chips│ →    │ Top 3 cards  │  →    │ แผน + route  │  →    │ กำลังเที่ยว   │  →    │ บันทึกไว้    │
│ origin      │      │ 2 Hit + 1    │       │ cheapest ⇄   │       │ เช็คอิน       │       │ ทริปที่ผ่านมา│
│ budget auto │      │ Unseen       │       │ fastest      │       │ spend จริง   │       │ taste profile│
│ ↓ หาที่     │      │ + ดูเพิ่ม    │       │ chaining     │       │ replan ฝน   │       │ PDPA ลบข้อมูล│
└─────────────┘      │ + import     │       │ ↓ เริ่มเที่ยว │       │ confirm ราคา│       └──────────────┘
                     └──────────────┘       └──────────────┘       └──────────────┘
```

### S1 — `/app` (`app/app/page.tsx`)
- เลือก intent: work / date / family / photo
- เลือก origin zone (6 zones + "อื่นๆ")
- งบ auto ตาม intent table (editable)
- `BUDGET_DEFAULTS`: work=450, date=900, family=1200, photo=600
- เปลี่ยน intent → budget reset (setBudget(null))

### S2 — `/app/results` (`app/app/results/`)
- Top 3 = 2 Hit + 1 Unseen (contract 2.6)
- unseen validation_count ≥ 3 ถึงจะโชว์ (U002 count=2 ถูกซ่อน)
- unseen pool empty → fallback + log event `unseen_pool_empty`
- "ดูเพิ่ม" สูงสุด 4 (สลับ hit/unseen)
- วางลิงก์ TikTok/IG → manual import (ทีมงานดึงใน 24 ชม., ห้าม scrape spec 2.11)
- route fallback (origin=อื่นๆ) → สูตร Grab + กล่อง "ขอเส้นทางของฉัน"

### S3 — `/app/plan/[id]` (`app/app/plan/[id]/page.tsx`)
- RouteLegs: cheapest ⇄ fastest toggle
- journey costing: `dayBudgetEst = ceil10((Σ stops mid + Σ route mid) × 1.10)`
- chaining panel "ไปไหนต่อ" — กรองตามเวลาเปิด-ปิด + งบที่เหลือ
- empty state ตามเวลา: ดึก → "ปิดหมดแล้ว — ลองใหม่ช่วงเช้า"

### S4 — `/app/trip/[id]` (`app/app/trip/[id]/page.tsx`)
- เริ่ม trip → status=active, นับค่าเดินทางเป็นรายจ่ายทันที
- เช็คอิน + บันทึกจ่ายจริง (ตามประเมิน หรือพิมพ์เอง)
- replan ☔ ฝนตก → `indoor=1` กรอง indoor เท่านั้น
- done → confirm ราคา 2 จุดแรก (crowdsource validation)
- สี: budget_actual > planned → แดง / ≤ → เขียว

### S5 — `/app/me` (`app/app/me/page.tsx`)
- tab บันทึกไว้ / ทริปที่ผ่านมา / ข้อมูลของฉัน
- taste profile = นับการใช้งานจริง (no ML)
- PDPA wipe: ลบจากทุกตาราง (users, plans, saves, events, imports)

## API Endpoints

| Endpoint | Method | หน้าที่ |
|----------|--------|---------|
| `/api/me` | GET | saves + plans + taste |
| `/api/me` | DELETE | PDPA wipe |
| `/api/saves` | POST | toggle save venue |
| `/api/imports` | POST | รับลิงก์ TikTok/IG (manual queue) |
| `/api/events` | POST | fire-and-forget tracking |
| `/api/venues` | GET | Top 3 + routes สำหรับ origin |
| `/api/plans` | POST | สร้าง plan (validation: intent/origin/venue_id/budget>0) |
| `/api/plans/[id]` | GET/PATCH | ดู/แก้ plan (route_toggle, budget_edit, add_stop, start, checkin, spend, done) |
| `/api/chain` | GET | chaining suggestions (time, indoor, budget, exclude) |

## Data Model (`lib/types.ts`)

- `Venue`: id, name_th, zone_id, category, intents[], badge (hit/unseen), hit_rank, unseen_rank, transition_rank, attributes, price_per_head_min/max, open/close_time, walk_min_from_hub, source, last_validated_at, validation_count
- `Route`: origin_zone → dest_zone, kind (cheapest/fastest), legs[]
- `RouteLeg`: mode (walk/win/boat/bts/mrt/songthaew/van/grab), detail_th, price_min/max, minutes, warning_th
- `Plan`: user_id, intent, origin_zone, status (draft/active/done), route_kind, budget_planned, budget_actual, stops[]
- `PlanStop`: seq, venue_id, est_cost, actual_cost, checked_in_at
- `User`: budget_defaults, taste (Record<string, number>)
- `GnEvent`: user_id, type, payload, created_at

## Pure Functions (`lib/`)

### `costing.ts`
- `mid(a,b)` = round((a+b)/2)
- `ceil10(x)` / `round5(x)`
- `routeCost(legs)` → {min, max, minutes}
- `fmtRange(min,max)` → "200฿" | "180–210฿"
- `bahtChipText(legs)` → "วิน 20฿ + เรือ 27฿ = 47฿"
- `dayBudgetEst(stopMids, legMids)` = ceil10((Σ+Σ)×1.10)
- `grabEstimate(km)` = round5((45+9.5×km)×{0.85, 1.25})

### `budget.ts`
- `budgetDefault(intent, donePlans)`: ≥3 done → median(budget_actual) round50 / ไม่งั้น table

### `top3.ts`
- `top3(venues, intent)`: 2 Hit + 1 Unseen, unseen count≥3, fallback hit 3rd if pool empty
- sort by hit_rank/unseen_rank ASC, null → Infinity
- more[] สลับ hit/unseen สูงสุด 4

### `chaining.ts`
- `chainSuggestions(venues, opts)`: กรอง zone + เวลาเปิด-ปิด + indoor + budget + excludeIds
- arriveAt = now + 30 นาที (เผื่อเดินทาง)
- sort by transition_rank ASC, null ไปท้าย
- สูงสุด 3 ผล

## Data Roadmap (ตามสเปคในโค้ด)

### ตอนนี้ (dev)
- fixtures ใน `lib/fixtures.ts` — placeholder "(ตัวอย่าง)"
- store = JSON file ที่ `.data/store.json` (dev)
- auth = anonymous device id (localStorage `gn_device`)

### W2 field sprint (ถัดไป)
- เก็บข้อมูลจริงตาม CSV template (spec 2.4)
- validate สถานที่: validation_count ≥ 3 ถึงจะโชว์ unseen
- เก็บเส้นทางจริง (ไม่ใช้สูตร Grab)
- stale check: last_validated_at < 45 วัน → flag

### Supabase (spec 2.1)
- `lib/store.ts` เขียน function ให้ swap ได้โดยแทบไม่ต้องแก้ caller
- ต้องการ credentials + schema migration

### Auth v1.1
- LINE Login แทน anonymous device id

### Landing page (PART B)
- `app/page.tsx` ตอนนี้แค่ redirect → /app
- PART B จะมาแทนด้วย landing จริง

## Stale / Fresh Rule (Gap Fix D)
- `STALE_DAYS = 45` — venue ที่ `last_validated_at` เก่ากว่า 45 วัน → ต้อง revalidate
- fixtures ใช้ `2026-07-12` (fresh ในช่วง dev)

## ไฟล์ที่เกี่ยวข้อง

```
gonai/
├── app/
│   ├── api/{me,saves,imports,events,venues,plans,chain}/route.ts
│   ├── app/{page,results/,plan/[id],trip/[id],me}/page.tsx
│   ├── layout.tsx          # header + footer + font
│   └── globals.css         # design tokens
├── components/             # VenueCard, RouteLegs, BudgetBar, IntentChips, BahtChip, TrustBadge
├── lib/
│   ├── types.ts            # data model + labels
│   ├── fixtures.ts         # placeholder data (ห้ามใช้ production)
│   ├── costing.ts          # journey cost math
│   ├── budget.ts           # budget default logic
│   ├── top3.ts             # 2 Hit + 1 Unseen selection
│   ├── chaining.ts         # "ไปต่อ" suggestions
│   ├── server.ts           # route lookup + plan expansion
│   ├── store.ts            # JSON store (swap → Supabase)
│   ├── api.ts              # client fetch helper
│   └── device.ts           # anonymous device id
├── tests/logic.test.ts     # 32 integration tests
├── QA-RESULTS.md           # QA 10 รอบ
└── PLAN.md                 # ไฟล์นี้
```

## คำสั่ง

```bash
npm run dev      # รัน dev server (localhost:3000)
npm run check    # รัน integration tests (tsx tests/logic.test.ts)
npm run build    # production build
```