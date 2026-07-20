# GoNai — Plugin 5 จอจาก "Gonai Design/" เข้าแอปจริง — Implementation Plan v1

> Mockup ต้นแบบ: `Gonai Design/*.html` (5 ไฟล์ — เปิดดูใน browser ประกอบ)
> ภาษา design: Origin v0.5 เดิมของแอป (`app/globals.css` มี token ครบแล้ว: --bg/--card/--line/--ink/--mut/--accent/--pill/--ok/--warn/--bad, .o-mono/.o-serif/.o-pill-primary/.o-pill-dark, motion gn-*)
> **กติกาเหล็ก (จากบทเรียน audit): ทุกอย่างที่ UI แสดง ต้องมาจากข้อมูล/การกระทำจริง — ไม่มี hardcode ที่โกหกผู้ใช้แม้แต่จุดเดียว**

## 0. Backend เพิ่มนิดเดียว (ทำก่อน)

1. `lib/store.ts` interface + `lib/store-json.ts` + `supabase/store-adapter.ts`:
   ```ts
   countEvents(user_id: string, type: string): Promise<number>;
   ```
   - json: filter events นับ · supabase: `select('id', { count: 'exact', head: true }).eq(...).eq(...)`
2. `/api/me` GET เพิ่ม `priceConfirms: await store.countEvents(auth.id, "price_confirm")` ใน response
3. ห้ามแตะอย่างอื่นใน lib/api — ที่เหลือ client-side ทั้งหมด

## 1. Planner (`app/app/planner-client.tsx`) — Mood tiles + Split-pay

### Mood tiles (ต้นแบบ: Gonai app.html แถวบน)
- แถว 4 tiles เหนือ 3 คอลัมน์ (ambience gradient class ที่มีอยู่: o-ambience-{work,date,family,photo} + .o-grain)
- แตะ = ตั้งค่าจริงแล้ว refetch:
  - 💻 งานนอกบ้าน → intent work + filters {quiet:true, plugs:true} + budget BUDGET_DEFAULTS.work
  - 💛 เดทอาทิตย์นี้ → intent date + filters {} + budget date
  - 👨‍👩‍👧 พาครอบครัว → intent family + filters {indoor:true} + budget family
  - 📷 ถ่ายรูปสวย → intent photo + filters {} + budget photo
- tile ของ intent ปัจจุบัน = ขอบขาว (บอกสถานะจริง) · track("mood_tile", {intent})
- subtitle ในแต่ละ tile เขียนจากสิ่งที่มันตั้งจริง (เช่น "เงียบ · ปลั๊ก · งบ ~450฿") — ห้ามเขียนเกินสิ่งที่ tile ทำ
- **hint bar เดิมใน Shell ให้ลบออก** (mood tiles ทำหน้าที่ onboard-in-context แทน) — ลบ state showHint + block ทั้งก้อนใน `app/shell.tsx`

### Split-pay (ต้นแบบ: Gonai app.html col 3)
- ใต้ budget box ใน col 3: แถว "แบ่งจ่ายกับเพื่อน" — stepper − n + (1..12, default จาก localStorage `gn_split_n` ?? 1)
- n = 1 → แสดงแค่แถว stepper เฉยๆ ไม่มีตัวเลขต่อหัว · n ≥ 2 → `~{ceil(base/n)}฿ / คน` + บรรทัดเล็ก "จากยอด {base}฿"
  - base = plan ? (status==="draft" ? est_total : spent) : est รวมปัจจุบัน — ใช้ตัวเลขจริงที่โชว์อยู่ในกล่องงบ
- persist n ลง localStorage ทุกครั้งที่เปลี่ยน · track("split_set", {n})
- **ห้าม**ใส่ข้อความ PromptPay (ยังไม่มีจริง — อยู่ในแผนโหมดกลุ่ม)
- ทำซ้ำใน `app/app/plan/[id]/page.tsx` (trip + done view ใต้กล่องงบ) — แยก component `components/SplitPay.tsx` รับ prop { base } ใช้ร่วมกัน

## 2. Taste DNA chip (`app/shell.tsx` header — ต้นแบบ: Gonai app.html มุมขวาบน)

- Shell fetch `/api/me` ครั้งเดียวตอน mount (gn() เดิม, .catch เงียบ)
- แสดง chip เมื่อ **มี done plans ≥ 1 เท่านั้น** — ไม่มีข้อมูล = ไม่แสดงอะไรเลย (ห้าม placeholder)
- เนื้อหา derive จากข้อมูลจริง:
  - จุด 5 จุด: เติมสี --accent ตาม min(5, done plans count)
  - ป้ายข้อความ ≤ 3 ชิ้นจากกติกา: (1) intent ที่ทำบ่อยสุดจาก taste key `intent:*` → "สายทำงาน/สายเดท/สายครอบครัว/สายรูป" (2) save category บ่อยสุดจาก `save:*` → "คาเฟ่/ร้านอาหาร/กิจกรรม/ตลาด" (3) ถ้า done ≥ 2 และทุกทริป actual ≤ planned → "งบเซฟ" / ถ้าเกินบ่อยกว่าไม่เกิน → "สายจัดเต็ม" / นอกนั้นไม่โชว์ชิ้นที่ 3
- คลิก chip → ไป `/app/me` · title attribute อธิบาย "สร้างจาก N ทริปที่จบจริง"

## 3. Onboarding (`app/app/welcome/page.tsx` ใหม่ — ต้นแบบ: Gonai-onboarding.html)

- 3 ขั้น ข้ามได้ทุกขั้น + ปุ่ม "ข้ามทั้งหมด — ใช้เลย →" ทุกหน้า:
  1. แนวเที่ยว: 🤫 สายเงียบ (→ default filter quiet) / 🎉 สายคึกคัก (ไม่ตั้ง filter) / 🍜 สายกิน (→ filter food) / 📷 สายรูป (→ default intent photo)
  2. สไตล์งบ: เซฟ ×0.8 / กลาง ×1 / จัดเต็ม ×1.3 / แล้วแต่วัน (ไม่ตั้ง) — คูณกับ BUDGET_DEFAULTS แล้ว round50
  3. ย่านบ้าน: chips โซนจาก ZONES fixtures + อื่นๆ → เซฟ `gn_origin`
- เก็บผลลง localStorage: `gn_pref` = JSON {vibe?, budgetMul?, } + `gn_origin` + ตั้ง `gn_onboarded=1` เมื่อจบ/ข้าม → `router.replace("/app")`
- planner อ่าน `gn_pref` ตอน init: apply default intent/filters/budget (ครั้งแรกของ session เท่านั้น — ห้าม override ค่าจาก query string `?intent=`/`?add=`)
- redirect เข้า onboarding: ใน planner useEffect — ถ้า `!localStorage.gn_onboarded` **และ** ไม่มี query param ใดๆ (`add/intent/origin/budget`) → `router.replace("/app/welcome")`
- track("onboarding_done", {vibe, budgetMul, origin}) / track("onboarding_skip")
- หน้า welcome ไม่โชว์ Taste DNA chip (Shell เช็ค pathname)

## 4. Live mode (`app/app/plan/[id]/page.tsx` trip view — ต้นแบบ: Gonai live.html)

รื้อ layout ของ TRIP VIEW เดิม (การกระทำ/act ทุกตัวคงเดิม: checkin, spend, done, replan, maps):
1. **Sticky tracker**: กล่องงบเดิมย้ายขึ้นเป็น sticky top (top-[57px] ใต้ header Shell, backdrop-blur, border-b hairline): แถว LIVE badge + origin→สยาม + "จ่ายจริง X฿ / Y฿ · เหลือ Z฿" ตัวเลข count-up เดิม + bar เดิม
2. **การ์ดจุดปัจจุบัน**: stop แรกที่ยังไม่จบ (checked_in && actual_cost===null → "อยู่ที่นี่ กรอกจ่ายจริง" / ยังไม่ checkin → "ถัดไป: เช็คอินเมื่อถึง") — ambience ตาม category + ชื่อใหญ่ + ปุ่มนำทาง (mapsUrl เดิม) + ปุ่มเช็คอิน/บันทึกจ่าย (logic เดิมทั้งหมด ย้ายเข้าการ์ดนี้)
3. **Timeline ทีละก้าว**: route.legs (สถานะ ✓ เมื่อ status active — ผู้ใช้เดินทางมาแล้ว) → ตามด้วย stops: checked_in+actual!==null = ✓ เขียว / จุดปัจจุบัน = วงแหวน --accent / ที่เหลือ = ถัดไป · แต่ละแถวมีราคา (จริงถ้าจ่ายแล้ว ✓, ประเมิน~ ถ้ายัง)
4. จุดอื่นที่ไม่ใช่ปัจจุบัน: กดเพื่อเช็คอิน/กรอกได้เหมือนเดิม (แถว expand ได้ หรือปุ่มเล็กใน timeline — เลือกแบบที่โค้ดสะอาด)
5. ปุ่ม replan ☔ + จบทริป ✓ อยู่ท้ายเหมือนเดิม
- มือถือเป็นหลัก (การ์ดคอลัมน์เดียว max-w-xl กลางจอ) — desktop ก็ใช้ layout เดียวกัน

## 5. Explore (`app/app/explore/page.tsx` — ต้นแบบ: Gonai explore.html)

1. **ผังระยะเดิน (ไม่ใช่แผนที่จริง — ไม่มีพิกัดจนกว่า W2)**: SVG/absolute ใน div:
   - จุดกลาง = "BTS สยาม" · วงแหวน 3 วง = เดิน ≤5 / ≤10 / ≤15+ นาที (mono label บนวง)
   - pin แต่ละ venue: รัศมีตาม walk_min_from_hub (clamp 15), มุม = deterministic จาก hash(venue.id) — **ห้ามสุ่ม** (ต้อง SSR-safe และ reproducible)
   - pin สไตล์ mockup: วงกลม emoji + label ชื่อสั้น · ขอบขาว = hit, ขอบ --accent = unseen · คลิก pin → `/app?add=<id>`
   - ป้ายมุม: "ผังระยะเดินจาก BTS สยาม — ตำแหน่งจริงรอพิกัดจาก W2" (ความซื่อสัตย์ต้องอยู่บนจอ ไม่ใช่ใน comment)
2. **Filter chips เหนือผัง**: ทั้งหมด / 💜 Unseen เท่านั้น / intent 4 ตัว / 🪙 ≤150฿ — กรอง client-side ทั้งผังและ grid พร้อมกัน (data มีครบ: badge, intents, price_per_head_min/max)
3. **Grid ขวา**: การ์ดแถวนอนแบบ mockup — เรียง hit_rank ก่อนแล้ว unseen_rank · meta = ราคา + attribute เด่น + **"✓ ยืนยันแล้ว N คน" จาก validation_count จริง** — ห้ามใส่ "▲ เพิ่มเข้าแผน N ครั้ง" (ยังไม่มี endpoint นับ event ต่อ venue — อย่าสร้างตัวเลขлож)
4. `/api/explore` ปรับ: คืน venues ที่โชว์ได้ทั้งหมด (hit ทุกตัว + unseen ที่ count≥3) ไม่จำกัด 4 — planner ของหน้า explore กรองเอง
5. ส่วนวิดีโอครีเอเตอร์เดิม: ย้ายลงล่างผัง (คงพฤติกรรม ส่งคลิป→imports เดิมทุกอย่าง)

## 6. Trip history (`app/app/me/page.tsx` — ต้นแบบ: Gonai triphistory.html)

เพิ่มเหนือ 3 คอลัมน์เดิม (ของเดิมคงหมด: auth/LINE, PDPA wipe, saves, imports):
1. **แถวสถิติ 4 ใบ** (ทั้งหมดคำนวณจาก me.plans + priceConfirms จริง):
   - ทริปทั้งหมด = done plans count
   - ใช้ไปทั้งหมด = Σ budget_actual (done)
   - แม่นเฉลี่ย = mean(|est_total − budget_actual| / est_total) เป็น ±N% — โชว์เมื่อ done ≥ 1, ไม่งั้นใบนี้เป็น "—"
   - ราคาที่ยืนยัน = me.priceConfirms (จาก API ใหม่)
2. **Badge 4 ใบ** — เงื่อนไขจริง + โชว์ progress จริง:
   - 🧾 นักยืนยันราคา: priceConfirms ≥ 3 (progress n/3)
   - 🧭 ครบทุกเช็คอิน: มีทริป done ที่ทุก stop checked_in ≥ 3 ทริป (progress n/3)
   - ✨ นักล่า Unseen: stops ใน done plans ที่ venue.badge==="unseen" ≥ 3 (progress n/3)
   - 🎯 งบเป๊ะ: done ติดกันล่าสุดที่ actual ≤ planned ≥ 5 (progress n/5)
   - ใบที่ยังไม่ได้ = opacity ต่ำ + progress · **ไม่มีระบบแต้ม/รางวัลแลก — เป็นสถิติความจริงเท่านั้น**
3. **ที่ชอบไปซ้ำ**: นับ venue ซ้ำจาก stops ของ done plans, โชว์ top 3 ที่ count ≥ 2 — ไม่มีทริปซ้ำ = ไม่โชว์ section
4. รายการทริปเดิม: อัพเกรดสไตล์เป็นแบบ mockup (thumbnail ambience + ยอด + ต่ำกว่า/เกินงบ)

## 7. Journey script (สคริปต์ทดสอบของเรา — แก้ได้)

`/private/tmp/claude-501/-Users-suvichakjarunopratamp/f4e8bd2f-4e1c-4177-943d-4a2f86dccda0/scratchpad/driver/journey.mjs`:
- เพิ่มขั้นแรก: เปิด /app (context ใหม่ = ไม่มี gn_onboarded) → คาดว่า redirect ไป /app/welcome → screenshot → กด "ข้ามทั้งหมด — ใช้เลย →" → กลับ /app
- เพิ่มขั้น: คลิก mood tile "💛 เดทอาทิตย์นี้" → รอ intent เปลี่ยน (hero text) → คลิกกลับ "💻 งานนอกบ้าน"
- เพิ่มขั้น: split-pay กด + สองครั้ง → เช็ค per-head โผล่
- ขั้นเดิมทั้งหมดต้องยังผ่าน (โดยเฉพาะ trip flow ที่ layout เปลี่ยน — ปุ่ม "เช็คอิน", "ตามประเมิน", "จบทริป ✓", "แชร์สรุปทริป" ข้อความเดิมต้องยังหาเจอ)

## 8. กติกา + Verify

1. ห้ามแตะ: `lib/*` (ยกเว้น store 3 ไฟล์ตาม §0), `app/api/*` (ยกเว้น me + explore ตาม §0/§5), tests logic เดิม, TripRecap canvas
2. copy ไทยเดิมคงไว้ ยกเว้นจุดที่ plan สั่งเพิ่ม/เปลี่ยน · ทุกตัวเลขบนจอ = คำนวณจากข้อมูลจริง
3. ใช้ design token + motion class เดิมทั้งหมด — ห้ามเพิ่ม dependency
4. เพิ่ม infra test 2 ข้อใน `tests/infra.test.ts`: countEvents (json store, ผ่าน GN_DATA_FILE ชี้ไฟล์ temp) นับถูก + นับเฉพาะ type ที่ขอ — ถ้าทำแล้วยุ่งเกิน ให้ smoke ผ่าน API แทนแล้วบอกใน report
5. Loop: `npx tsc --noEmit && npm run check` เขียวตลอด → journey.mjs ใหม่ผ่านครบ → **Read screenshot จริงทุกจอ** เทียบ mockup (`shots/gd-*.png` มีให้เทียบ) → จบ: kill :3000 → `npm run build` → เปิด dev กลับ → commit "feat: 5 จอใหม่จาก Gonai Design — mood tiles·split-pay·DNA·onboarding·live·explore·history"
6. dev server รันอยู่ :3000 hot reload — ห้าม build ระหว่างเปิด
