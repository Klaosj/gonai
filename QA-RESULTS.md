# GoNai QA Run — 10 Rounds
Date: 2026-07-20
Tester: Hermes Agent (glm-5.2:cloud)
Mode: dev server `npm run dev` @ localhost:3000

## ก่อนเริ่ม
- เซิร์ฟเวอร์ขึ้น (307 redirect / → /app) ✓
- ไม่มี JS errors ใน console (React DevTools info เท่านั้น)
- ผ่าน flow 5 หน้าจอพื้นฐานมาแล้ว ทุกตัวเลข cross-check ผ่าน

## ผลรวม: 10/10 ทำสำเร็จ · 0 logic bugs · 1 UX gap · 2 input validation gaps

---

### R1 — S1 budget edit + intent reset ✓ ผ่าน
- เลือก intent=work → งบ 450฿ (default)
- แก้งบเป็น 600฿ → แสดง "งบ ~600฿ ✎"
- เปลี่ยน intent เป็น date → งบ reset เป็น 900฿ (date default)
- โค้ด `setBudget(null)` ใน onChange ทำงานถูก

### R2 — origin=อื่นๆ → fallback Grab ✓ ผ่าน
- `/api/venues?intent=date&origin=other` → `routes.fallback=true`
- synthetic route สร้างด้วยสูตร Grab: 135-200฿, 33 นาที
- UI แสดงกล่อง "ขอเส้นทางของฉัน" ตามสเปค

### R3 — S2 family/photo pool ✓ ผ่าน
- family: pool 1 (V012 ตลาดนัด), unseenPoolEmpty=true
- photo: pool 1 (U003 ดาดฟ้าแกลเลอรี), unseenPoolEmpty=false
- Pool เล็กตาม fixtures (work เท่านั้นที่มี 5 ที่)

### R4 — unseen validation_count < 3 ห้ามโชว์ ✓ ผ่าน
- U002 (validation_count=2) ไม่โผล่ใน pool ไหนเลย
- U003 (validation_count=4 ≥ 3) โผล่เป็น unseen
- event `unseen_pool_empty` ถูก log 3 ครั้งใน store

### R5 — S3 route toggle est_total ✓ ผ่าน
- cheapest (R001: วิน+เรือ+เดิน=47฿) → est_total=280฿ = ceil10((200+47)×1.1)
- toggle เป็น fastest (R002: Grab 180-210฿, mid=195) → est_total=440฿ = ceil10((200+195)×1.1)
- ตัวเลขเปลี่ยนตาม route ถูกต้อง

### R6 — chaining ดึก empty state ✓ ผ่าน (logic), ⚠️ UX gap
- time=00:30 → 0 ผล (ทุกที่ปิด)
- time=09:00 → 3 ผล
- time=14:00 → 3 ผล
- logic ถูก แต่ panel ว่างไม่บอกผู้ใช้ว่า "ทุกที่ปิดแล้ว"
- UX gap ไม่ใช่ bug — แนะนำแก้: empty state message "ที่ใกล้ๆ ปิดหมดแล้ว (เวลา X โมงแล้ว) — ลองใหม่พรุ่งนี้"

### R7 — replan indoor=1 ✓ ผ่าน
- indoor=1 กรอง V012 (ตลาดนัด, indoor=false) ออก → ได้แค่ indoor=true
- ไม่ส่ง indoor → V012 โผล่มา
- กรองถูกตาม `v.attributes.indoor`

### R8 — done เกินงบ → สีแดง ✓ ผ่าน
- budget_planned=200, spend=500, done → budget_actual=547
- "547฿" มี class `text-gn-red`, color rgb(198,54,44) = แดงจริง
- (ตรวจผิดรอบแรกเพราะเลือก `<b>` ผิดตัว — ตัวแรกใน `<p>` เป็น "280฿" ไม่ใช่ "547฿")

### R9 — PDPA wipe ✓ ผ่าน
- ก่อน: 2 users, 3 plans, 13 events
- DELETE /api/me สำหรับ uid หนึ่ง
- หลัง: 1 user, 2 plans, 6 events — uid ที่ลบหายจากทุกตาราง
- `wipeUser()` ลบจริงทุกตารางตามสเปค A12

### R10 — API edge cases ✓ 8/10 ผ่าน + 2 input validation gaps
- 10a invalid venue_id → 404 ✓
- 10b unknown action → 400 ✓
- 10c nonexistent plan → 404 ✓
- 10d missing type → 400 ✓
- 10e missing url → 400 ✓
- 10h invalid venue_id (saves) → 404 ✓
- 10i nonexistent plan (chain) → 404 ✓
- 10j empty payload → 200 (payload defaults to {}) ✓
- ⚠️ 10f missing intent → 200 สร้าง plan สำเร็จ (intent=None) — ไม่มี runtime validation
- ⚠️ 10g budget ≤ 0 → 200 สร้าง plan สำเร็จ (budget_planned=-100) — `??` ไม่จัด -100 เป็น null

---

## ข้อสังเกตุระหว่างทาง
1. window.confirm() ใน R9 ทำให้ browser ค้าง — QA อัตโนมัติควรใช้ API ตรงๆ แทน UI
2. ตรวจ DOM ต้องระวัง selector — ใน R8 เลือก b ตัวแรกใน p ผิด ทำให้คิดว่าเป็น bug
3. โค้ดสะอาดมาก — pure functions ใน lib/ ทดสอบง่ายผ่าน API ตรงๆ

## ข้อแนะนำ
1. แก้ UX gap R6: chain panel ว่างตอนดึกควรแสดง empty state message
2. เพิ่ม input validation ใน POST /api/plans: ตรวจ intent อยู่ใน ["work","date","family","photo"] และ budget > 0
3. ทำ R10 เป็น integration test ใน tests/logic.test.ts (ไฟล์ที่ package.json ชี้แต่ยังไม่มี)

## สรุป
GoNai ผ่าน QA 10 รอบโดยไม่มี logic bug จริงๆ — โค้ดแข็งแรง ตัวเลข cross-check ผ่านทุกจุด มี 1 UX gap และ 2 input validation gaps ที่ไม่ critical แต่ควรแก้ก่อน production