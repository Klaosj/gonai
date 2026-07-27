# GoNai Launch Runbook — ขั้นตอนภายนอก (Klao ทำเอง)

> โค้ดพร้อมแล้ว (ดู docs/superpowers/plans/2026-07-27-real-life-launch.md) — ไฟล์นี้คือทุกอย่างที่เหลือ
> ทำตามลำดับ ข้ามไม่ได้ เว้นแต่บอกว่า optional

## 0. ของที่ต้องมีก่อนเริ่ม
- [ ] โดเมนจริง (ตัดสินใจแล้วจดตรงนี้: `https://____________`) — ห้ามมี trailing slash ทุกที่ที่กรอก
- [ ] บัญชี Supabase (free tier พอ — capacity คิดแล้วใน PLAN.md เกิน 10 เท่าของเป้า)
- [ ] บัญชี Vercel (hobby พอ) + repo push ขึ้น GitHub (private ได้)
- [ ] คำตัดสินครบแล้ว 2026-07-27: D1 founder=3 · D3 ราคา online · D5 Ollama-first (ดูตาราง decisions ใน plan) — เหลือแค่โดเมน (D6)

## 1. Supabase (~15 นาที)
1. สร้างโปรเจคใหม่ region **Singapore (ap-southeast-1)** — ใกล้ผู้ใช้ไทยสุด
2. SQL Editor → paste ทั้งไฟล์ `supabase/schema.sql` → Run (ต้องจบไม่มี error)
3. Settings → API: copy **Project URL** และ **service_role key** (ไม่ใช่ anon!)
4. ใส่ใน `.env` เครื่องตัวเอง: `SUPABASE_URL=...` `SUPABASE_SERVICE_KEY=...`
5. ซ้อมมือ: `npm run seed:w2 -- --dry` → ต้องเห็น `21 venues, 12 routes`
   (ยัง**ห้าม** seed จริง — FIELD-CHECKLIST สั่งห้าม seed ข้อมูลที่ยังไม่ field-verify ขึ้น production)
6. seed ชั่วคราวสำหรับทดสอบระบบ: `npm run seed` (fixtures placeholder 9 ร้าน — dry run โชว์ 7 zones, 9 venues, 6 routes) — พอไว้ smoke test
   ข้อมูลจริงค่อยทับตอนหลัง field day (ขั้น 6)

## 2. Vercel (~20 นาที)
1. Import repo จาก GitHub → framework Next.js (auto) — `vercel.json` จะบังคับ preflight ก่อน build ให้เอง
2. Environment Variables (ตั้งทั้ง **Production และ Preview**):
   - `GN_AUTH_SECRET` = ผลจาก `openssl rand -base64 32`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` = จากขั้น 1
   - `NEXT_PUBLIC_BASE_URL` = `https://<โดเมน>` **ไม่มี trailing slash**
   - `OLLAMA_URL` = `https://ollama.com` · `OLLAMA_MODEL` = `minimax-m3:cloud` (หรือรุ่นที่ใช้จริง) · `OLLAMA_API_KEY` = สร้างจาก ollama.com → Settings → API Keys — **คำตัดสิน D5: chat ใช้ Ollama cloud ก่อน** (ล่มชั่วคราว = ตกไป quick parser เอง แอปไม่พัง)
   - `ANTHROPIC_API_KEY` = **ยังไม่ตั้ง** (D5: ค่อยเปิดเมื่อผู้ใช้เยอะ — วันไหนตั้ง มันจะกลายเป็น engine แรกแทน Ollama อัตโนมัติ ไม่ต้องแก้โค้ด)
   - `LINE_CHANNEL_ID` + `LINE_CHANNEL_SECRET` = ตั้ง**คู่กัน**หรือไม่ตั้งเลย (ครึ่งเดียว = preflight fail)
   - **ห้าม**ตั้ง `NODE_ENV` เอง (Vercel จัดการ และตั้งเองจะทำ devDependencies หายตอน install → tsx/preflight พัง)
3. ก่อนกด deploy: รัน `npm run preflight` ในเครื่องด้วย env ชุดเดียวกัน → ต้องผ่านครบ
4. Deploy → ผูกโดเมนจริง
5. Smoke test บนโดเมนจริง:
   - `curl https://<โดเมน>/api/health` → ต้อง `{"ok":true,"store":"supabase",...}` — ถ้า `"store":"json"` หรือ 503 = env หาย ห้ามไปต่อ
   - เปิด `/app` สร้างแผน 1 อัน → กด Start → Check in → Done ครบวงจร
   - พิมพ์ chat 1 ข้อความ → คำตอบต้องมี badge GONAI AI เฉยๆ (ถ้าเห็น `· QUICK MATCH` ตลอด = Ollama cloud ไม่ทำงาน เช็ค OLLAMA_API_KEY/URL แล้วดู Vercel logs บรรทัด `[chat] ollama fallback:`)
   - `/app/me` → ข้อมูลของฉัน → ลองปุ่ม PDPA wipe → ข้อมูลหาย

## 3. LINE Login (~10 นาที · optional — แอปใช้ anonymous ได้เต็มรูปแบบ)
1. LINE Developers Console → channel (LINE Login) → Callback URL ใส่:
   `https://<โดเมน>/api/auth/line/callback`  (ตัวเดียว บรรทัดเดียว ห้าม slash ซ้อน)
2. ทดสอบจริง: เปิดแอปแบบ anonymous → สร้างแผน 1 อัน → Sign in with LINE → แผนต้องตามมา (migration)
3. ทดสอบ error path: ปิด LINE_CHANNEL_SECRET ชั่วคราวใน Vercel → กดปุ่ม → ต้องเห็น toast แจ้ง (ไม่เงียบ) → เปิดคืน

## 4. Monitoring (~5 นาที)
1. UptimeRobot (ฟรี): HTTP monitor → `https://<โดเมน>/api/health` ทุก 5 นาที → alert เข้า email
   (health ฉลาดแล้ว: prod หลุดไป JSON store = 503 = ร้องทันที)
2. ดู client error จริง: Supabase dashboard → Table editor → `events` → filter `type = client_error`
3. Server error: Vercel → Functions → Logs

## 5. Field day (ตาม data/w2/FIELD-CHECKLIST.md — เดิน 5 โซน)
- ตรวจ 21 ที่ + 12 เส้นทางตามลำดับโซน A→E ใน checklist · จดราคา/เวลาจริงทับใน CSV
- V106 (Erawan Tea Room) / U103 (GATTA cafe) / U106 (BANGKOK sign) = confidence ต่ำสุด — ห้ามข้าม
- SEA LIFE (V108): CSV ใช้ราคา online 690–990 แล้ว (D3) — หน้างานเช็คว่าราคา online ยังจริง + จดราคา gate ไว้ประกอบ
- validation_count = **3** ทุกแถวที่ Klao ตรวจครบเอง (คำตัดสิน D1 founder-validation → gem โชว์ตั้งแต่วันแรก) · แถวที่ตรวจไม่ทัน/ไม่ผ่าน = คง 0 (ไม่โชว์เป็น gem และป้ายขึ้น "not traveler-confirmed" ตามจริง)
- `last_validated_at` = วันที่เดินจริง (ไม่ใช่วันแก้ไฟล์)

## 6. ปิด field day → ข้อมูลจริงขึ้น production
รันตามลำดับในเครื่อง (env ชี้ production แล้วจากขั้น 1):
1. `npm run check` — pipeline test ตรวจ CSV ที่แก้มาให้ทั้งไฟล์ (mode ผิด/ราคา NaN/route_id ชน = แดงทันที)
2. `npm run fixtures:w2` แล้ว `npm run check && npx tsc --noEmit && npm run build` — fixtures ใหม่ต้องเขียวทุก gate
3. commit CSV + fixtures ที่ generate: `git add data/w2 lib/fixtures.ts && git commit`
4. `npm run seed:w2 -- --dry` ดูตัวเลขก่อน แล้วค่อย `npm run seed:w2` จริง
5. เปิดแอปบนโดเมนจริง: Top-3 ต้องเป็นร้านจริงย่านสยาม · เลือก origin ปิ่นเกล้า → ต้องเห็นเส้นทาง bus 🚌
6. push → Vercel auto-deploy (fixtures ใหม่ = fallback ฝั่งโค้ดตรงกับ DB)

## 7. Launch + สัปดาห์แรก
- แชร์ลิงก์จริงครั้งแรก — soft launch ก่อน ยังไม่ประกาศวงกว้าง
- เช็คทุกเช้า: UptimeRobot เขียว · Vercel function errors · events `client_error` · events `unseen_pool_empty` (ถ้าเยอะ = มี combo ที่ gem ไม่มี)
- waitlist: ดูตาราง `waitlist` ใน Supabase dashboard

## ข้อจำกัดที่จดไว้แล้ว ยอมรับได้ (อย่าตกใจตอนเจอ)
- **RLS policies ใน schema เป็น defense เผื่ออนาคต** — แอปใช้ service key (ข้าม RLS) เท่านั้น
  ห้ามเพิ่ม client ที่ใช้ anon key โดยไม่ wire `app.user_id` ก่อน ไม่งั้นอ่านอะไรไม่ได้เลย
- **seed เป็น upsert ไม่ลบของเก่า** — ถ้าเปลี่ยน venue_id/ตัดร้านออกจาก CSV ต้องไปลบแถวเก่าใน dashboard เอง
- **PDPA wipe ไม่แตะตาราง waitlist** (ไม่มี user_id เชื่อม — consent แยกตอนกรอกฟอร์ม) — ถ้ามีคนขอลบ
  contact จาก waitlist ให้ลบมือใน dashboard
- **rate limit เป็น in-memory ต่อ instance** — scale หลาย instance เพดานรวมสูงขึ้น (ย้าย Upstash ทีหลังถ้าจำเป็น)
- **events โตเร็วสุด** — ถึง 100k rows ค่อยตั้ง retention 90 วัน (PLAN.md จดไว้แล้ว)
- **ตัวเลือก origin ใน S1 มาจาก fixtures ฝั่ง client** — เพิ่มโซนใหม่ = แก้ CSV + fixtures + deploy ไม่ใช่แค่ DB
- **npm audit เหลือ 3 high ใน chain ของ next** (postcss pin 8.4.31 + sharp ^0.34.3 ข้างใน next เอง — แก้ไม่ได้โดยไม่ downgrade ข้าม major) — จดไว้ใน commit 360cdc4 · เช็คทุกครั้งที่ next ออก release ใหม่: npm audit --omit=dev
