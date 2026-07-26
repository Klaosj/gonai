# GoNai — MVP Build Plan

> แผนการทำงานรวม ดึงจาก inline specs ในโค้ด (lib/, app/api/, app/app/) มารวมที่เดียว
> อ้างอิง: MVP Build Spec v1.0

## ภาพรวมโปรเจค

แอปวางแผนเที่ยว 1 วัน พร้อมค่าเดินทาง+งบทุกบาท ก่อนออกจากบ้าน เน้นย่านสยามเป็น launch zone

- **Tech**: Next.js 15 (App Router) + React 19 + Tailwind v4 (`zustand` อยู่ใน package.json แต่ยังไม่มีไฟล์ไหน import — state ทั้งแอปเป็น useState/useRef)
- **UI**: Mobile-first (max-w-md), ข้อความในแอปเป็นภาษาอังกฤษ, ตัวอักษร IBM Plex Sans Thai
- **ตัวอักษร v0.8** (2026-07-26, `app/layout.tsx`) — ตระกูล IBM Plex ล้วน:
  - ตัวหนังสือทั้งหมด (display + body + ชื่อร้าน) = **IBM Plex Sans Thai** 300–700 · subsets `thai` + `latin` → var `--font-plex-thai`
  - ตัวเลข/ป้าย mono = **IBM Plex Mono** 400–600 → var `--font-mono`
  - `.o-serif`/`.gn-serif` (display) ชี้มาที่ Plex Thai แล้ว — ชื่อคลาสเดิมทั้งแอปไม่ต้องแตะ · tracking -0.01em (เดิม -0.02em ของ Bricolage บีบเกินไปสำหรับสระไทย)
  - หนักสุดที่ใช้ได้คือ **700** (Bricolage เดิมมี 800) — `.gn-logo-word` และ canvas ของ TripRecap ปรับตามแล้ว
  - **Instrument Sans + Bricolage Grotesque ถูกถอดออกทั้งคู่** (ไม่มีอักษรไทย ทำให้ชื่อร้านไทยจาก W2 หลุดไปเป็นฟอนต์ระบบ)
  - canvas ของ `TripRecap` อ่านชื่อ family จาก CSS var (`--font-plex-thai` / `--font-mono`) แทนพิมพ์ชื่อตรงๆ — next/font สร้างคู่ family เสมอ (`'IBM Plex Sans Thai'` + `'…Fallback'` ที่ปรับ metric) การ์ด PNG จึงใช้ฟอนต์ชุดเดียวกับหน้าจอ · ฟอนต์ถูก preload ตอน mount ไม่ใช่ตอนกดปุ่ม เพราะ `navigator.share` ต้องอยู่ใน user gesture เดิม
  - ระวัง: Tailwind v4 มี theme var ชื่อ `--font-mono` ของตัวเอง — ที่ชนะคือของ next/font (class บน `<html>` ไม่ได้อยู่ใน `@layer`) · ทั้งแอปไม่ได้ใช้ utility `font-sans`/`font-mono` เลย จึงไม่มีจุดไหนหลุด
  - **stack ของ mono ทุกคลาสต้องต่อท้ายด้วย Plex Thai** (`.o-mono`, `.o-mono-text`, `.o-btn-label`, `.gn-step` + `mono` ใน TripRecap) — IBM Plex Mono ไม่มี subset ไทย **และไม่มีแม้แต่ ฿ (U+0E3F)** ถ้าไม่ต่อ ตัวเลขเป็น mono แต่ ฿ กับชื่อร้านไทยหลุดไปฟอนต์ระบบ
  - โหลด mono น้ำหนัก 700 ด้วย เพราะ canvas ของ recap วาดตัวเลขเงินที่ 700 (ไม่งั้นได้ตัวหนาสังเคราะห์)
  - `.o-marker` คงค่า `74%` ไว้ — เรนเดอร์เทียบ 58/66/74/82% ที่ 36px และ 54px แล้ว ต่ำกว่านี้แถบขึ้นไปคาดกลางคำ · **% นี้อิงกล่อง inline ของฟอนต์ เปลี่ยนฟอนต์เมื่อไรต้องดูภาพจริง ห้ามคำนวณเอา**
  - โลโก้: ธงขยับจาก `bottom: 0.78em` → `0.86em` (จุดบน i ของ Plex กลมใหญ่กว่า Bricolage จนโคนเสาทับจุด)

## บั๊ก layout ที่เจอตอน QA ฟอนต์ (มีมาก่อน ไม่ได้เกิดจากฟอนต์ — แก้แล้วทั้งหมด 2026-07-26)

กวาดด้วย headless Chrome 6 หน้า × 9 ความกว้าง (360→1440) + หน้า plan ทั้ง 3 สถานะ + หน้าแชร์

| อาการ | สาเหตุ | แก้ที่ |
|-------|--------|--------|
| `/app/explore` ล้นแนวนอน 360px=136px · 390px=106px · 640px=16px | `aspect-[4/3]` + `min-h` → CSS แปลงความสูงขั้นต่ำข้ามอัตราส่วนเป็นความกว้างขั้นต่ำ (480/640px) และ grid track `auto` โดนชื่อร้านที่ truncate ดันเป็น 408px | `explore/page.tsx` — ตัด `min-h` เหลือ `aspect-[4/3]` ล้วน + `grid-cols-[minmax(0,1fr)]` |
| header ล้นจอ 640–789px (iPad แนวตั้ง 768) เมื่อมีทั้งทริป active และทริป done | แถวหัวต้องการ 790px (โลโก้ 116 + แท็บ 311 + LIVE&nbsp;pill&nbsp;+&nbsp;Taste&nbsp;DNA 265 + avatar) | `shell.tsx` — Taste DNA chip และข้อความ "· back to trip" ขึ้นเฉพาะ `lg` |
| ชื่อร้านในการ์ด explore ถูกตัดทุกใบที่ 390px (ช่องเหลือ 142px แต่ชื่อยาว 175–231px) | badge เต็มกินความกว้าง ~100px | ป้ายสั้นบนมือถือ + `line-clamp-2` แทน `truncate` |
| ป้ายชื่อหมุดในผังทับกันเอง 9 คู่ · caption บังป้ายวงนอก | ป้าย pill กว้าง ~105px ทุกอันบนผังกว้าง 358px | ซ่อนป้ายชื่อหมุดต่ำกว่า `sm` + caption ใช้ข้อความสั้นบนมือถือ |
| หน้าแชร์: คำว่า "budget" ตกไปคนละบรรทัดกับตัวเลข | แถว `flex justify-between` ที่ป้าย mono ตกเป็น 2 บรรทัดแล้วบีบคอลัมน์ขวา | `p/[id]/page.tsx` — วางซ้อนบนมือถือ (`flex-col sm:flex-row`) + `whitespace-nowrap` |
- **Design tokens** (v0.7 "Forest on White + brand gradient" — ค่าจริงอยู่ที่ `app/globals.css`):
  - พื้นขาว `#ffffff` + หมึก `#121411` + accent `#107f6b` / bright `#41b982`
  - brand gradient จากตัว G ของโลโก้: teal `#0f9fa6` → `#41b982` → lime `#6ccf63` (`--gn-brand-grad`, 38deg)
  - `--gn-red: #c6362c` (over budget) / warn `#a8641d`
  - โลโก้: `components/Logo.tsx` (เครื่องบิน + G gradient + ธงชาติบนหัว i + tagline) · ต้นฉบับ `public/logo.png` · icons ทั้งชุด gen จาก `public/icon.svg`

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
- [x] Supabase migration — `supabase/schema.sql` (9 ตาราง + RLS) + `supabase/store-adapter.ts` **wire แล้วจริง**: `lib/store.ts` เป็น async facade เลือก backend อัตโนมัติ (JSON dev / Supabase prod) ทุก API route ใช้ผ่าน facade
- [x] Catalog ใน DB — ตาราง `zones/venues/routes` + `lib/catalog.ts` (cache 5 นาที, fallback fixtures) + `supabase/seed.ts` — ทีม field ops แก้ข้อมูลร้าน/เส้นทางใน dashboard ได้โดยไม่ต้อง deploy
- [x] Auth hardening (2026-07-20) — ตัวตนอยู่ใน httpOnly cookie เซ็นด้วย HMAC (`gn_uid`) ที่ server ออกเอง แทน `x-gn-user` header ที่ client ปลอมได้ · plan มี ownership check · PDPA wipe ลบได้แค่ของตัวเอง · production บังคับ `GN_AUTH_SECRET`
- [x] LINE Login v1.1 wire ครบ — ปุ่ม login ใน S5 → `/api/auth/line/login` → callback ตรวจ state (HMAC + หมดอายุ 10 นาที) → migrate ข้อมูล anonymous จาก signed cookie (มากับ redirect เสมอ — แก้บั๊กเดิมที่อ่านจาก header ซึ่งไม่มีทางมากับ redirect)
- [x] W2 field sprint mock — `tests/w2-data.ts` (24 venues + 16 routes ครอบ 8 origins) · พิมพ์เป็น fixtures: `tests/w2-seed.ts` · seed ลง DB: `supabase/seed.ts --w2`
- [x] Waitlist — `POST /api/waitlist` + ฟอร์มบน landing (PDPA consent + rate limit ต่อ IP)
- [x] Rate limit — `lib/ratelimit.ts` (in-memory): imports 5/ชม., events 60/นาที, waitlist 5/ชม./IP
- [x] แก้ QA ค้าง — `window.confirm` ใน S5 เปลี่ยนเป็น in-app confirm dialog
- [x] Infra tests — `tests/infra.test.ts` (11 ข้อ: cookie signing/tamper, rate limit, catalog fallback, w2 sanity)

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
| `/api/plans/[id]` | GET/PATCH | ดู/แก้ plan (route_toggle, budget_edit, add_stop, start, checkin, spend, done) — เจ้าของเท่านั้น |
| `/api/chain` | GET | chaining suggestions (time, indoor, budget, exclude) — เจ้าของเท่านั้น |
| `/api/waitlist` | POST | เก็บ contact จาก landing (PDPA consent บังคับ) |
| `/api/auth/line/login` | GET | redirect ไป LINE Login |
| `/api/auth/line/callback` | GET | แลก code + migrate ข้อมูล + เซ็น cookie ใหม่ |
| `/api/auth/line/logout` | POST | ล้าง cookie ตัวตน |
| `/api/chat` | POST | chat-to-plan: Claude Haiku 4.5 (structured output) แปลข้อความอิสระ → action (intent/origin/budget/filters) · ไม่มี key = quick parser (`lib/chat.ts`) · rate limit 30/5นาที · client ประกอบคำตอบจากตัวเลขจริงเอง |

ทุก endpoint ระบุตัวตนจาก signed httpOnly cookie `gn_uid` (ดู `lib/auth.ts`) — ไม่มี header auth อีกต่อไป

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

## Capacity Estimate (system design row — คิดแล้ว อย่า over-engineer)

- สมมติสุดโต่งช่วง launch สยาม: 1,000 DAU × 20 req/วัน = 20k req/วัน ≈ **0.23 QPS เฉลี่ย · peak ~1.2 QPS (5×)**
- Storage: plan ~2KB × 3 ทริป/สัปดาห์/ผู้ใช้ + events ~0.5KB → **ระดับ MB/เดือน**
- ข้อสรุป: Supabase free tier + Vercel hobby เอาอยู่เกิน 10 เท่าของเป้า — **ห้ามเพิ่ม infra จนกว่าตัวเลขจริงจะเถียง**
- จุดที่จะพังก่อนถ้าโต: events โตเร็วสุด (fire-and-forget ทุก interaction) → ตั้ง retention 90 วันใน Supabase เมื่อถึง 100k rows

## Monitoring (system design row)

- `/api/health` — เช็ค catalog + store ตอบ 200/500 → ผูก UptimeRobot (ฟรี, ยิงทุก 5 นาที) หลัง deploy
- Client error → event `client_error` (Shell ดัก window.onerror + unhandledrejection, จำกัด 1/30วิ/เครื่อง)
- ดู error จริง: query ตาราง events where type='client_error' ใน Supabase dashboard
- Server error: Vercel function logs (มากับ platform)

## Data Roadmap

### ตอนนี้
- dev: fixtures + JSON store ที่ `.data/store.json` — อัตโนมัติเมื่อไม่มี env
- prod: ตั้ง `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` → ทุกอย่างเข้า Supabase (user data + catalog)
- auth: anonymous ผ่าน signed cookie ทันทีที่แตะ API แรก · LINE Login เมื่อตั้ง `LINE_CHANNEL_ID/SECRET`

### ขั้น deploy จริง (เหลือทำ)
1. สร้างโปรเจค Supabase → รัน `supabase/schema.sql` ใน SQL Editor
2. `npx tsx supabase/seed.ts --w2` (staging) หรือไม่ใส่ `--w2` (fixtures)
3. ตั้ง env บน host: `GN_AUTH_SECRET` (บังคับ), `SUPABASE_*`, `NEXT_PUBLIC_BASE_URL`, `LINE_*`
4. LINE Developers Console: ตั้ง callback URL = `https://<domain>/api/auth/line/callback`

### W2 field sprint (งานภาคสนาม — ตัวจริงของ product)
- เก็บข้อมูลจริงตาม CSV template (spec 2.4) — สยาม 15-20 ที่ + เส้นทางจริง 6 origins
- validate สถานที่: validation_count ≥ 3 ถึงจะโชว์ unseen
- ใส่เข้า DB ผ่าน Supabase dashboard หรือ CSV → `tests/csv-to-fixtures.ts` → seed
- stale check: last_validated_at เก่ากว่า 45 วัน → revalidate

### ข้อจำกัดที่รู้อยู่ (ยอมรับได้ระดับ MVP)
- rate limit เป็น in-memory ต่อ instance — scale หลาย instance เพดานรวมสูงขึ้น (ย้าย Upstash/Redis ทีหลัง)
- โซนใน S1 origin picker มาจาก fixtures ฝั่ง client (สเปค pin 6 โซน + อื่นๆ) — เพิ่มโซนใหม่ใน DB ต้องอัพเดต UI ด้วย
- JSON store ไม่รองรับ serverless — dev เท่านั้น (facade บังคับ Supabase เมื่อมี env)

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
│   ├── fixtures.ts         # placeholder data (dev fallback)
│   ├── costing.ts          # journey cost math
│   ├── budget.ts           # budget default logic
│   ├── top3.ts             # 2 Hit + 1 Unseen selection
│   ├── chaining.ts         # "ไปต่อ" suggestions
│   ├── catalog.ts          # zones/venues/routes (Supabase + cache, fallback fixtures)
│   ├── server.ts           # route lookup + plan expansion (async)
│   ├── store.ts            # store facade (interface + เลือก backend)
│   ├── store-json.ts       # JSON backend (dev เท่านั้น)
│   ├── auth.ts             # signed cookie + LINE Login
│   ├── ratelimit.ts        # in-memory sliding window
│   └── api.ts              # client fetch helper
├── supabase/
│   ├── schema.sql          # 9 ตาราง + RLS
│   ├── store-adapter.ts    # Supabase backend + catalog fetch/upsert
│   └── seed.ts             # seed catalog (fixtures | --w2)
├── tests/
│   ├── logic.test.ts       # 32 integration tests
│   ├── infra.test.ts       # 11 infra tests (auth/ratelimit/catalog)
│   ├── w2-data.ts          # W2 mock data (24 venues + 16 routes)
│   └── w2-seed.ts          # พิมพ์ W2 mock เป็น fixtures
├── QA-RESULTS.md           # QA 10 รอบ
└── PLAN.md                 # ไฟล์นี้
```

## คำสั่ง

```bash
npm run dev                        # รัน dev server (localhost:3000)
npm run check                      # tests: logic 32 ข้อ + infra 11 ข้อ
npm run build                      # production build
npx tsx supabase/seed.ts           # seed catalog ลง Supabase (fixtures)
npx tsx supabase/seed.ts --w2      # seed catalog ลง Supabase (W2 mock 24 venues)
npx tsx tests/w2-seed.ts > lib/fixtures.ts   # ใช้ W2 mock เป็น fixtures local
```