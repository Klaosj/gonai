# GoNai improvement plan — 24 Sep 2026

Approved by Klao 24 Sep 2026 ("ตาม recommendation ทุกข้อ ยกเว้นเรื่อง AI model"), then AI model = 5A ("ตาม recommendation ทุกข้อ 5A").

## Diagnosis (audit 24 Sep 2026)
- **Usage ≈ 0 after launch week.** `events`: 41 events / 12 users on 16–19 Aug, then 1 event from 20 Aug to 23 Sep. Supabase free tier pauses projects after 7 days of low activity → the project went INACTIVE (restored 24 Sep).
- **Chat runs on the quick parser only.** Ollama cloud returns HTTP 402 "not included in your free usage" for `minimax-m3:cloud` (tested 24 Sep). Every chat message on 24 Sep = `engine: quick`. **Decision 5A (Klao, 24 Sep): keep the quick parser until the field day is done** — real data matters more than AI chat right now; 0฿. Options for later: Claude via `ANTHROPIC_API_KEY` (already first in the engine order) or Ollama credits for `minimax-m3`. Free models that still answered on 24 Sep: `gpt-oss:120b-cloud`, `gpt-oss:20b-cloud`.
- **Overclaims.** Landing, OG description, in-app footer, share page and README said "validated by real visitors", "field-collected", "9 real travelers". All 21 real venues in `data/w2/` are desk research (`validation_count = 0`).
- **Stale fares.** Landing showed BTS 44฿ / 37฿. BTS fare table effective 1 Nov 2025: Ha Yaek Lat Phrao (N9) → Siam 64฿, On Nut (E9) → Siam 47฿ (`data/w2/routes.csv` R103/R105).
- **Security.** next 15.5.22 had 2 critical RCE advisories (GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36, published 8 Sep 2026, fixed in 15.5.24). GoNai was not exposed (no `next/image`, hosted on Vercel Linux).

## P0 — branch `fix/p0-truth-keepalive` (this branch)
1. Copy tells the truth: no "validated / field-collected / 9 real travelers"; fares 64฿ / 47฿ / boat 20–26฿ from `data/w2/routes.csv`; "one unseen gem when one fits".
2. Fixture fares R003/R005 → 64฿ / 47฿ (same as landing).
3. Keep-alive: Vercel cron hits `/api/health` daily 01:00 UTC (Hobby plan allows daily only) → one catalog read per day keeps Supabase active.
4. `npm audit fix` → next 15.5.26 (critical cleared). Left: postcss inside next (build-time only, our own CSS) — needs next 16.
5. Welcome "Skip — just browse" hit area ≥ 24 px (WCAG 2.5.8).
- Outside the code: Klao creates a free UptimeRobot monitor on `/api/health` (5-min checks, alerts by email). Free plan = personal / non-commercial use.
- Prod DB: live `route_legs` for R003/R005 updated to 64/47 to match; audit test rows from 24 Sep 23:20–23:40 ICT removed.

## P1 — next 2–3 weeks
6. **Field day** (Klao, one Saturday before mid-October): 21 venues + 12 routes per `data/w2/FIELD-CHECKLIST.md` → `npm run seed:w2`. Transport ~500฿ (estimate: 12 routes × 30–40฿ + small buys).
7. Weekly backup (`pg_dump` → `~/Backups/gonai-*.sql`, launchd).
8. Fare watch: Pao Tang 60/40 subsidy ends 30 Sep 2026; unified 17–45฿ per-trip cap across 8 lines targeted 1 Jan 2027 (Cabinet 23 Jun 2026, Thai nationals, Tang Rat app) → recheck fares in Dec 2026. Only Purple + Red have a 40฿/day cap today (until 30 Nov 2026); BTS stays distance-based.

## P2 — only after P1
9. Three TikTok clips in the existing "เที่ยวสยาม 1 วัน งบ ___ บาท" format, filmed on the field day.
10. Stop rule: ≥ 30 plans from people other than Klao within 4 weeks of the clips → continue (LINE OA, domain). Below → park GoNai as a portfolio piece.

## Not now
New features · custom domain · Vercel Analytics (the `events` table already tracks the funnel) · LINE login.
