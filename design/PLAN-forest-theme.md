# GoNai — Theme swap → "Forest on White" — Implementation Plan v1

> ต้นแบบ: `/Users/suvichakjarunopratamp/Downloads/Mindtrip Design System/*.dc.html` (เวอร์ชัน root ไม่ใช่ Cream Theme)
> Klao ยืนยันโทนนี้จาก screenshot: ขาวล้วน + หมึกดำ + เขียวป่า + มาร์กเกอร์เขียวใต้พาดหัว
> **กติกาเหล็ก: เปลี่ยนเฉพาะ สี / font / motion — LAYOUT, โครง JSX, copy, logic ห้ามแตะทั้งสิ้น**
> (ยกเว้นจุดเดียวที่ plan สั่ง: เปลี่ยน `<em>` italic เป็น marker highlight — เป็น visual ไม่ใช่ copy)

## 1. Tokens — เขียนทับส่วนสีใน `app/globals.css` (โครงสร้าง/คลาสเดิมคงชื่อเดิมทั้งหมด)

```css
--bg: #ffffff;            /* จากมืด #0b0b0c → ขาว */
--bg-elev: #f2f2ee;       /* ราง toggle, พื้นรอง (จากไฟล์: #f2f2ee/#ecece7) */
--card: #ffffff;          /* การ์ดขาว (เดิม rgba ขาวโปร่งบนมืด) */
--card-solid: #ffffff;
--line: #e3e3dd;          /* hairline เทาอุ่น (เดิม rgba ขาว .1) */
--ink: #121411;           /* หมึกดำอมเขียว */
--mut: #70746e;           /* รอง (secondary เข้ม #52564f ใช้เป็น text-mut/80 ได้) */
--accent: #1e7f4f;        /* เขียวป่า — แทนฟ้าซีด #cfe6f5 เดิมทุกจุด */
--accent-bright: #34a869; /* ใหม่: มาร์กเกอร์/gradient CTA */
--tint: #dcefe3;          /* ใหม่: พื้น badge/chip เขียวอ่อน */
--pill: #121411;          /* ปุ่ม/ชิป active = ดำ ตัวขาว — bg-pill+text-bg เดิมจะกลับสีเองพอดี */
--ok: #1e7f4f;  --warn: #a8641d;  --bad: #c6362c;  /* bad จาก pulseDot ในไฟล์ต้นแบบ */
```
- เงา: แทนเงาดำเดิมด้วยชุดต้นแบบ `0 2px 6px rgba(18,20,17,.05), 0 18px 44px rgba(18,20,17,.10)` (hover ยกเป็น `.14`)
- `.gn-glass` header → `rgba(255,255,255,.82)` + blur เดิม + border-b `--line`
- `::selection` → `rgba(52,168,105,.28)`
- `.o-grain` → ลด opacity เหลือ ~0.18 (บนพื้นขาว grain แรงแล้วสกปรก)
- ambience ต่อ intent (hero/thumbnail — คลาสเดิม `o-ambience-*`) → pastel จากไฟล์ต้นแบบ:
  work `#dcefe3→#a8c9ee` · date `#f6e7dc→#eecfc0` · family `#d3ecda→#a9dcbb` · photo `#f2ecd9→#e4d3a8`
  **ตัวอักษรบน ambience เปลี่ยนเป็น --ink** (เดิมขาว — บนพาสเทลต้องดำ ตรวจทุกจุดที่ทับ)
- explore walk-chart: กลับเป็นสว่าง — พื้น `#f7f7f4` + วงแหวน `#e3e3dd` + pin ขอบ --ink / unseen ขอบ --accent · legend/label พื้นขาว

## 2. Fonts — `app/layout.tsx` (next/font/google)

- Display: **Bricolage_Grotesque** (`opsz 12..96, wght 500..800`) → ผูกกับ var เดิมของ `.o-serif` (คงชื่อคลาส แก้ font-family + letter-spacing -0.02em + weight 700-800) — Fraunces ออก
- Body: **Instrument_Sans** (400-700) + คง **IBM_Plex_Sans_Thai** ใน stack ต่อท้าย (ชื่อร้านจริงจาก W2 จะเป็นไทย)
- Mono: IBM Plex Mono คงเดิม
- `.o-serif em` เดิม (italic) → คลาสใหม่ `.o-marker`: `font-style:normal; box-shadow: inset 0 -0.34em 0 var(--accent-bright)` — ใช้แทน `<em>` ใน hero landing + หัว section ที่มี em (แก้ className/แท็กได้เฉพาะจุด em เหล่านี้)

## 3. Motion — เพิ่ม 3 ท่าจากต้นแบบ (keyframes จริงจากไฟล์) + คงระบบเดิมทั้งหมด

```css
@keyframes gn-bob { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
.gn-bob { animation: gn-bob 8s ease-in-out infinite; }        /* สติ๊กเกอร์อีโมจิ landing (ตุ๊กตุ๊ก/เรือ ถ้ามี) */
@keyframes gn-pulse-ring { 0%{box-shadow:0 0 0 0 rgba(30,127,79,.4)} 70%{box-shadow:0 0 0 14px rgba(30,127,79,0)} 100%{box-shadow:0 0 0 0 rgba(30,127,79,0)} }
.gn-pulse-ring { animation: gn-pulse-ring 2.6s cubic-bezier(.32,.72,0,1) infinite; }
```
- `gn-pulse-ring` ใส่ที่: ปุ่มลูกศรใน ask-bar ของ landing (วงกลมเปลี่ยนเป็นพื้น --accent ตัวขาว) + ปุ่ม "Start the trip ▶" ใน planner col3
- `gn-live-dot` → เพิ่มวงกระเพื่อมแดง: `box-shadow` ring แบบ pulseDot ต้นแบบ `rgba(198,54,44,.5)`
- marquee/cloud/floaty/rise/press/sheet/count-up เดิม **ห้ามแตะ** — easing เดิมเข้ากันแล้ว
- `.gn-cta` เงาส้มเดิม → เงา ink อ่อน `0 4px 14px rgba(18,20,17,.18)`
- landing: แถบ marquee (ถ้ามี ticker ใน landing เราไม่มี — ข้าม) / กล่อง CTA waitlist ล่าง: พื้น gradient `linear-gradient(160deg,#34a869,#7fce9f)` ตัว --ink ปุ่ม Join = ดำ (map เข้าโครง CTA section เดิม)

## 4. จุดตรวจต่อ surface (layout เดิม — เช็คแค่สี/contrast)

1. Shell: nav ขาว, แท็บ active = pill ดำตัวขาว, DNA chip: จุดสี --accent, footer mono --mut
2. Landing: hero ambience เดิมเป็น gradient มืด → เปลี่ยนเป็น **พื้นขาวล้วน** + สติ๊กเกอร์การ์ดลอยเดิม (การ์ดขาว+เงานุ่ม) · `<em>` ทั้งหมด → `.o-marker` · badge → พื้น --tint mono --ink · ask-bar ขาว+เงา+ปุ่มกลม --accent gn-pulse-ring
3. Planner: การ์ดขาว, mood tiles → ambience pastel + ตัว --ink, chips active ดำ, งบ/ตัวเลข --ink, bar --ok, ฝน banner: ขอบ --warn พื้น #fdf6ec
4. plan/[id]: tracker ขาว sticky (border-b --line), timeline ✓ = พื้น --tint ตัว --accent, LIVE dot แดง ring, done big number --ink (เกิน = --bad), recap ปุ่มดำ
5. TripRecap canvas (แก้เฉพาะสี/ฟอนต์สตริง): พื้น #ffffff, หัวตัว --ink, แถบล่าง gradient เขียว #34a869→#7fce9f ตัว --ink, ตัวเลขใหญ่ --ink/เกิน --bad
6. explore: ผังสว่างตาม §1, badge HIT = ดำตัวขาว / UNSEEN = --tint ตัว --accent ขอบ --accent
7. me/welcome/group: การ์ดขาว, badge earned = วง --tint ไอคอน --accent, ปุ่ม LINE คงเขียว LINE เดิม
8. Contrast ขั้นต่ำ: ตัวอักษรทุกตัวบนพื้นใหม่ ≥ 4.5:1 (ink/mut/accent บนขาวผ่านหมด — ระวังตัวขาวบน --accent ใช้ได้เฉพาะ bold ≥14px)

## 5. Verify (เหมือนทุกรอบ)

- `npx tsc --noEmit && npm run check` (49) เขียวตลอด · journey.mjs 13 ขั้น (copy ไม่เปลี่ยน — selector เดิมต้องผ่าน)
- Playwright screenshot ทุก surface แล้ว **Read ดูจริง** เทียบกับต้นแบบ `.dc.html` (เปิดไฟล์ต้นแบบใน Playwright ประกบได้: `file:///Users/suvichakjarunopratamp/Downloads/Mindtrip Design System/Landing.dc.html` ฯลฯ)
- mobile 430px: planner + trip
- จบ: kill :3000 → `npm run build` → เปิด dev กลับ → commit "theme v0.6 'Forest on White' — ขาว+หมึก+เขียวป่า ตาม design system ที่ Klao เลือก"
- dev server รันอยู่ :3000 — ห้าม build ระหว่างเปิด
