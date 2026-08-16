# GoNai × Origin-style Redesign — Implementation Plan v1

> อ้างอิง: https://useorigin.com/ (ศึกษาจาก screenshot จริง 2026-07-20)
> เป้าหมาย: รื้อ "ผิว" ทั้งแอปเป็นภาษา Origin — **functionality/copy/API/flow ห้ามเปลี่ยนแม้แต่จุดเดียว** เป็น visual refactor ล้วน

## 1. Design DNA ของ Origin (สิ่งที่ต้องจับให้ได้)

1. **Cinematic dark** — ฉากหลักเกือบดำ (#0b0b0c) ให้ความรู้สึกพรีเมียมสงบ ไม่ใช่ neon
2. **Editorial serif italic display** — พาดหัวใหญ่มาก serif ตัด italic บางคำ ("Own your wealth.") สีขาวบนภาพ
3. **Mono uppercase micro-labels** — ทุก label เล็ก/ปุ่ม/หัวการ์ด ใช้ monospace ตัวพิมพ์ใหญ่ letter-spacing กว้าง ("SPEND THIS MONTH", "GET STARTED →") — นี่คือลายเซ็นสำคัญที่สุด
4. **Floating glass app-cards** — การ์ด UI มืดโปร่ง (rgba dark + blur) มุมโค้ง ~20px ลอยบนพื้นหลังภาพ/พื้นผิว (ทราย, ทะเล, ฟ้า)
5. **ตัวเลขใหญ่สะอาด** — ตัวเลขเงิน sans ใหญ่ tabular
6. **ปุ่ม pill ขาว** — CTA หลัก = พื้นขาว ตัวดำ mono uppercase + ลูกศร → (ปุ่มรองเป็น dark pill โปร่ง)
7. **สีมาจาก "บรรยากาศ" ไม่ใช่ brand palette** — UI เป็น neutral ขาว/ดำ ส่วนสีสันมาจากภาพพื้นหลัง (ฟ้า, ทรายทอง, ทะเลเขียว)
8. **Badge ฟ้าอ่อน mono** — ชิปประกาศเล็กๆ พื้นฟ้าซีดตัวดำ

## 2. Tokens ใหม่ (เขียนทับ `app/globals.css` ทั้งไฟล์)

### สี
```css
--bg: #0b0b0c;            /* ฉากหลัก */
--bg-elev: #131315;       /* ชั้นยก */
--card: rgba(255,255,255,0.04);      /* การ์ดกระจกมืด */
--card-solid: #17181a;
--line: rgba(255,255,255,0.10);      /* hairline */
--ink: #f4f3ef;           /* ข้อความหลัก (ขาวอุ่น) */
--mut: #9b9a94;           /* ข้อความรอง */
--accent: #cfe6f5;        /* ฟ้าซีด (badge/ชิปเด่น) — จาก Origin */
--pill: #f4f3ef;          /* ปุ่มหลักขาว ตัวอักษร #0b0b0c */
--ok: #7ad0a6;  --warn: #e8b36a;  --bad: #e07a5f;   /* งบ: เขียว/เหลือง/แดง แบบ muted */
```
- semantic เดิม (`gn-green/gn-orange/...`) **map เข้า token ใหม่** ผ่าน @theme เพื่อให้ class `text-gn-*`/`bg-gn-*` เดิมในไฟล์ที่ไม่ได้แตะยังไม่พัง — แต่ไฟล์ที่รื้อให้เปลี่ยนมาใช้ชุดใหม่

### บรรยากาศต่อ intent (แทนภาพถ่ายที่ยังไม่มี — gradient หลายชั้น + grain)
```
work   = dawn:   #1a2733 → #35506b → #6f93b0   (ฟ้าเช้าตรู่)
date   = dusk:   #2b1a26 → #6b3550 → #c98a6f   (โรสทองพลบค่ำ)
photo  = golden: #2b2114 → #6b5535 → #d9a662   (golden hour)
family = fresh:  #14282b → #356b62 → #7fb0a0   (ทะเลเขียว)
```
- grain: SVG noise เป็น data URI ทับด้วย opacity ~0.35 ให้ผิว "ฟิล์ม" — ใส่เป็น utility `.o-grain::after`
- hero/thumbnail ของการ์ดใช้ ambience ตาม intent ปัจจุบัน

### Typography (เปลี่ยนใน `app/layout.tsx` — next/font)
- **Display Latin**: `Fraunces` italic + regular (ital,opsz,wght 400-700) — แทน Playfair
- **Thai + body**: `IBM Plex Sans Thai` (300,400,500,600,700) — แทน Noto (ตรง spec 2.7 เดิมพอดี)
- **Mono labels**: `IBM Plex Mono` (400,500,600)
- คลาส: `.o-serif` (Fraunces, italic ใช้ `<em>`), `.o-mono` (mono, uppercase, letter-spacing .14em, font-size 11-12px)
- ตัวเลขเงินทุกจุด: `.gn-num` (คงไว้ tabular-nums) ขนาดใหญ่ขึ้นหนึ่งขั้นตามสเกล Origin

### รูปทรง/เงา/motion
- radius: การ์ด 20px · ปุ่ม/ชิป pill 999
- เงา: แทบไม่ใช้เงาสี — ใช้ `0 24px 60px rgba(0,0,0,.5)` เฉพาะ overlay/dock
- motion: **คงระบบเดิมทั้งหมด** (gn-rise/stagger, gn-press, gn-sheet spring, gn-bar, useCountUp, reduced-motion) — เปลี่ยนแค่ผิว ไม่แตะจังหวะ ยกเว้น: ตัด gn-cta เงาส้มเรือง → hover ปุ่มขาวเป็น `filter: brightness(.92)` แบบ Origin

## 3. สเปคต่อ surface (ทุกหน้า ทุก component)

### 3.1 `app/shell.tsx` — nav
- แถบบนโปร่งบนฉากมืด: `rgba(11,11,12,.72)` + blur เดิม
- โลโก้: `Go` (Fraunces italic ขาว) + `Nai` (regular) — ไม่มีสีส้ม
- แท็บ: `.o-mono` uppercase — active = **pill ขาวตัวดำ**, ปกติ = ตัว --mut hover ขาว
- avatar: วงกลมขอบ hairline พื้น --card
- hint bar: พื้น --bg-elev ตัว --mut ขอบล่าง hairline (เลิกใช้ amber)
- footer: mono 11px --mut, ขอบบน hairline

### 3.2 `app/page.tsx` — landing
- **Hero แบบ Origin เป๊ะ**: เต็มจอ ambience dusk + grain · badge ฟ้าซีด mono "เบต้า · ฟรีช่วงทดลอง" · พาดหัว `Fraunces` 72-84px: `เที่ยวทั้งวัน` (Thai 300) + `<em>รู้ทุกบาท</em>` (italic) `ก่อนออกจากบ้าน` · sub 1 บรรทัด --mut · CTA pill ขาว mono "เริ่มวางแผนฟรี →"
- ใต้ CTA: **แถบ ask-style** (แบบช่อง search ของ Origin): กระจกมืด rounded-full ข้อความ placeholder "เสาร์นี้ไปไหนดี งบ 450฿…" + ปุ่มวงกลม ↑ — **ลิงก์ไป /app เฉยๆ** (ห้าม fake ว่าเป็น AI chat)
- Section problem/how-it-works/features: ฉาก --bg, หัวข้อ serif, การ์ด --card ขอบ hairline, label ทุกอันเป็น mono uppercase
- Waitlist form: input กระจกมืด + ปุ่ม pill ขาว
- ตัด orbs ลอยของเดิมออก (คนละภาษากับ Origin)

### 3.3 `app/app/planner-client.tsx` — จอหลัก
- ฉากทั้งหน้า --bg · สามคอลัมน์เป็น **การ์ดกระจกมืด** ขอบ hairline (คง grid/stagger เดิม)
- hero กลาง: ambience ตาม intent + grain + ชื่อเส้นทาง serif italic ("ลาดพร้าว → สยาม") + mono label งบ
- หัวคอลัมน์ ①②③: เลิกใช้ .gn-step สี → `.o-mono` --mut ("01 — เงื่อนไขของคุณ" ฯลฯ)
- ชิปทุกชุด (โซน/intent/ตัวกรอง): pill ขอบ hairline พื้นโปร่ง ตัว --mut · **active = พื้นขาวตัวดำ** (แบบเดียวทั้งระบบ ไม่มีเขียว/ส้ม/navy สามแบบแบบเดิม)
- กล่องเส้นทางใน col 1: การ์ดมืด rows + เส้นแบ่ง hairline + ยอดรวม **ตัวเลขใหญ่ 22px ขาว** + mono label "รวมขาไป"
- คำเตือนฝน: การ์ดมืดขอบ --warn ไอคอน ☔ ตัว --warn (เลิก amber bg สว่าง)
- import box: การ์ดมืดขอบ hairline หัว mono ม่วงซีด → ใช้ --accent แทนม่วง
- budget box col 3: สไตล์ "SPEND THIS MONTH" ของ Origin — mono label "งบวันนี้" + **ตัวเลข 32px** + bar บาง 4px (--ok→--warn ไล่ตาม % · เกิน = --bad) — คง useCountUp + gn-bar
- CTA "เริ่มเที่ยว ▶" → pill ขาว mono "เริ่มเที่ยว →"
- toast: การ์ดมืดขอบ hairline (คง gn-toast spring)

### 3.4 `components/VenueCard.tsx`
- การ์ดกระจกมืด · thumbnail = ambience intent + grain + emoji เล็กลง (36px) มุมล่างซ้าย
- badge: mono uppercase — HIT = พื้นขาวตัวดำ "HIT Nº1" · UNSEEN = พื้น --accent ตัวดำ "UNSEEN"
- BahtChip: pill มืดโปร่ง blur ตัว --accent mono
- attributes: ตัว --mut · trust line ตัว --ok
- ราคา: **20px ขาว** + "/คน" mono --mut
- ปุ่ม "+ เพิ่มเข้าแผน" → pill ขาว mono · หัวใจ save คง pop เดิม

### 3.5 `app/app/plan/[id]/page.tsx` + `components/{RouteLegs,BudgetBar}.tsx`
- ทุกการ์ด → กระจกมืด · view toggle = ราง --bg-elev, active pill ขาวตัวดำ
- RouteLegs: แถว legs + เส้น hairline คั่น + mono label โหมด ("BTS", "เรือ") — emoji คงได้
- LIVE badge: จุดแดง pulse เดิม + mono "LIVE" ขาว
- trip checklist: เช็คอินแล้ว = วง --ok ✓ (คง gn-pop) · ปุ่มเช็คอิน pill ขาว
- BudgetBar/progress: bar 4px --ok / เกิน --bad + ตัวเลข count-up เดิม
- Done: mono label "จ่ายจริงทั้งวัน" + **ตัวเลข Fraunces 64px** ขาว (เกิน = --bad) · การ์ดสรุป stops มืด · ปุ่มแชร์ recap = pill ขาว · กล่อง confirm ราคา = การ์ดมืด ปุ่ม "ใช่ ✓" pill ขาว / "เปลี่ยนเป็น…" ขอบ hairline
- bottom sheet: พื้น #17181a ขอบบน hairline (คง gn-sheet)

### 3.6 `components/TripRecap.tsx` — canvas PNG
- พื้น #0b0b0c · หัว mono uppercase ขาว "GONAI — TRIP RECAP" · ชื่อที่+ราคา ขาว/เทา · ตัวเลขใหญ่ 96px ขาว (เกิน --bad, ไม่เกิน --ok) · แถบล่าง ambience gradient ตาม intent + "GoNai — รู้ทุกบาทก่อนออกจากบ้าน"

### 3.7 explore / me / group / WaitlistForm / LoadingSkeleton
- explore: การ์ดวิดีโอ+hot มืด · ปุ่มส่งคลิป pill ขาว · badge mono
- me: การ์ดโปรไฟล์/ประวัติ/บันทึกมืด · taste bars = --accent · ปุ่ม LINE คงเขียว LINE #06c755 (แบรนด์เขา) แต่ทรง pill mono · โซน PDPA ลบ = ขอบ --bad
- group teaser: การ์ดมืด + ปุ่มสนใจ pill ขาว
- WaitlistForm: input มืด + ปุ่ม pill ขาว + error --bad
- LoadingSkeleton: shimmer โทนมืด `rgba(255,255,255,.05→.09)`

## 4. ข้อห้าม / กติกา

1. **ห้ามแตะ logic ใดๆ**: ไฟล์ `lib/*` (ยกเว้นไม่ต้องแตะเลย), `app/api/*`, tests, ฟังก์ชัน/props/state ใน component — เปลี่ยนเฉพาะ className/markup โครงเดิม/CSS/font/canvas สี
2. **copy ภาษาไทยทุกตัวคงเดิม 100%** (ยกเว้น mono label ภาษาอังกฤษที่เพิ่มตามสเปค เช่น "HIT Nº1")
3. คง a11y: contrast ≥ 4.5:1 บนฉากมืด (--mut บน --bg = ~5:1 ✓), focus-visible ring เปลี่ยนเป็นสีขาว, reduced-motion block คงเดิม
4. dev server รันอยู่ที่ :3000 (hot reload) — **ห้ามรัน `npm run build` ระหว่าง dev server เปิด** ปิดก่อนด้วย `lsof -ti :3000 -sTCP:LISTEN | xargs kill` แล้วค่อย build ตอนท้าย เสร็จแล้วเปิด dev กลับ
5. ทุก surface ต้องผ่านตาจริง: ใช้ Playwright ที่ลงไว้แล้ว

## 5. Verify loop (ทำตามลำดับ ทุกครั้งที่จบไฟล์ใหญ่)

```bash
cd "/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/GoNai"
npx tsc --noEmit && npm run check        # 48 ข้อต้องเขียวตลอด
# screenshot journey 9 ขั้น:
cd /private/tmp/claude-501/-Users-suvichakjarunopratamp/f4e8bd2f-4e1c-4177-943d-4a2f86dccda0/scratchpad/driver
node journey.mjs                          # ต้อง ✓ ครบ 9 + no console errors
# แล้ว Read ดูรูปใน shots/ ทีละใบ — ดูจริงๆ ว่าตรงสเปค ไม่ใช่แค่รันผ่าน
```
- จบงาน: kill :3000 → `npm run build` ต้องผ่าน → เปิด dev server กลับ → commit ("design v0.5 'Origin' — cinematic dark + serif editorial + mono labels")

## 6. ลำดับทำ (แนะนำ)

1. `app/globals.css` ทั้งไฟล์ + `app/layout.tsx` (fonts) — รากของทุกอย่าง
2. `app/shell.tsx` → screenshot เช็ค
3. `planner-client.tsx` + `VenueCard/BahtChip/TrustBadge/LoadingSkeleton` → journey เช็ค
4. `plan/[id]` + `RouteLegs/BudgetBar/TripRecap` → journey เช็ค
5. landing + `WaitlistForm` → เช็ค
6. explore / me / group → เช็ค
7. Verify รอบสุดท้าย + build + commit
