# GoNai Real-Life Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Workers MUST be dispatched with `model: sonnet` (Klao's standing rule).

**Goal:** Take GoNai from "green repo on Klao's laptop" to "real users planning real Siam trips on a public URL" — by closing every code gap found in the 2026-07-27 five-dimension launch audit, then handing Klao an exact runbook for the external steps (Supabase, Vercel, LINE, field day).

**Architecture:** No new features. Three kinds of work: (1) production hardening — make every "dev-only" fallback fail loudly instead of silently when it leaks into prod (store, health, chat, deploy gate); (2) data pipeline completion — a real command path from `data/w2/*.csv` into Supabase, plus the `bus` leg mode the Pinklao route needs; (3) honest UX — trust badge and LINE errors stop lying to users. Everything else (accounts, consoles, field walking) is Klao-manual and lives in the runbook created by Task 11.

**Tech Stack:** Next.js 15 (App Router) + React 19 + Tailwind v4 + Supabase (service key, server-only) + tsx test scripts (no test framework). No state library, no new dependencies — these are hard rules.

## Global Constraints

- Repo: `/Users/suvichakjarunopratamp/Desktop/Klao's Workspace/Code/gonai` — path contains an apostrophe; ALWAYS double-quote it in shell commands.
- Dev server: `PORT=3010 npm run dev` (Hermes bridge owns port 3000 — never kill it). Journey: `GN_BASE_URL=http://localhost:3010 npm run journey`.
- **No new npm dependencies.** If a task seems to need one, STOP and ask.
- UI copy is English. Repo docs and commit subjects are Thai (match existing style). Commit subjects concise, no ticket prefixes.
- Gates after every task: `npm run check` all-green and `npx tsc --noEmit` clean. `npm run build` is run at Task 3, Task 10, and Task 12 (build fights a running dev server over `.next/` — stop dev first; if build fails with `__webpack_modules__[moduleId] is not a function`, run `rm -rf .next` and retry once).
- Never add metadata file-convention files (icon.svg, apple-icon.png, manifest) into `app/` — the apostrophe path breaks next-metadata-route-loader. They live in `public/`.
- NEVER run `supabase/seed.ts` without `--dry` during development or tests. Only the runbook (Klao, with real env) runs it live.
- Baseline at plan time: HEAD `6a2ba38`, `npm run check` = 82/82 (logic 46 · infra 22 · pipeline 14), tsc clean, build green.
- Test harness: tsx scripts with local `test()/eq()/ok()` helpers (see `tests/infra.test.ts:20-39`) — no jest/vitest. New tests copy this style exactly.
- Env-mutating tests MUST restore env in `finally`, and restore-of-undefined must `delete process.env.X` (assigning `undefined` stores the string `"undefined"`).

## File Structure (what this plan touches)

| File | Action | Responsibility |
|---|---|---|
| `lib/store.ts` | modify | facade refuses JSON store in production (lazily, at first use) |
| `lib/health.ts` | create | pure health-verdict helper (testable) |
| `app/api/health/route.ts` | modify | 503 when prod is on JSON store |
| `vercel.json` | create | build command = preflight && build |
| `app/layout.tsx` | modify | `metadataBase` from `NEXT_PUBLIC_BASE_URL` |
| `lib/chat.ts` | modify | `ollamaAllowed()` prod guard helper |
| `app/api/chat/route.ts` | modify | skip Ollama leg when not allowed |
| `lib/auth.ts` | modify | trailing-slash-proof `lineRedirectUri()` |
| `app/app/me/page.tsx` | modify | `auth_error` → visible toast |
| `lib/types.ts` | modify | `LegMode` + `MODE_LABELS` gain `bus` |
| `components/RouteLegs.tsx` | modify | `MODE_EMOJI` gains 🚌 |
| `tests/csv-to-fixtures.ts` | modify | runtime mode whitelist (tsx does not type-check) |
| `data/w2/routes.csv` | modify | R107 leg 2 `van` → `bus` |
| `data/w2/FIELD-CHECKLIST.md` | modify | mark decision #2 resolved |
| `supabase/seed.ts` | rewrite | `--csv <v> <r>` + `--dry`, retire `--w2` |
| `package.json` | modify | `seed`, `seed:w2`, `fixtures:w2` scripts |
| `.gitignore` | modify | seed temp module |
| `lib/trust.ts` | create | pure trust-badge state (stale/unverified/confirmed) |
| `components/TrustBadge.tsx` | modify | render unverified state honestly |
| `supabase/schema.sql` + `supabase/migrations/20260720000000_init.sql` | modify | `imports(user_id)` index (files must stay byte-identical) |
| `tests/infra.test.ts`, `tests/pipeline.test.ts` | modify | new tests (~+17, 82 → ~99) |
| `docs/LAUNCH-RUNBOOK.md` | create | Klao's external-steps runbook |
| `PLAN.md` | modify | deploy section + commands updated |

Task order: 1→12 as numbered. Only hard dependency: Task 6 must land before Task 7 (Task 7's dry-seed test runs the real w2 CSVs, which after Task 6 contain `bus`).

---

### Task 1: Store facade refuses JSON store in production

The audit's #1 blocker: `lib/store.ts:37` picks the backend at import time from Supabase env presence only. If those vars are missing on Vercel, every user gets an EROFS 500 from `fs.writeFileSync` on a read-only filesystem — silently. The guard must fire at first *use*, not import (during `next build`, NODE_ENV=production and route modules get imported with no Supabase env — a module-load throw would kill every local production build).

**Files:**
- Modify: `lib/store.ts` (final lines, currently `export const store: Store = isSupabaseEnabled() ? supabaseStore : jsonStore;`)
- Test: `tests/infra.test.ts`

**Interfaces:**
- Consumes: `isSupabaseEnabled()` from `supabase/store-adapter.ts`, `jsonStore`, `supabaseStore` (all existing).
- Produces: `export function resolveStore(): Store` (env read at call time — tests use this) and `export const store: Store` (Proxy, same call surface as today — no caller changes anywhere).

- [ ] **Step 1: Write the failing tests** — append to `tests/infra.test.ts` inside `main()` (after the existing store tests; use dynamic import — `resolveStore` reads env per call so module caching is harmless):

```ts
  // ===== store: prod guard (launch audit 2026-07-27) =====
  await test("store: production + ไม่มี Supabase env → throw บอกชื่อ env", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;
      process.env.NODE_ENV = "production";
      const { resolveStore } = await import("../lib/store");
      let threw = false;
      try {
        resolveStore();
      } catch (e) {
        threw = true;
        ok(String(e).includes("SUPABASE_URL"), "error ต้องบอกชื่อ env ที่ขาด");
      }
      ok(threw, "production โดยไม่มี Supabase env ต้อง throw");
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = prevUrl;
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_KEY;
      else process.env.SUPABASE_SERVICE_KEY = prevKey;
    }
  });

  await test("store: dev ไม่มี Supabase env → ได้ jsonStore ตามเดิม", async () => {
    const { resolveStore } = await import("../lib/store");
    const s = resolveStore(); // NODE_ENV ตอนรัน test ไม่ใช่ production
    ok(typeof s.ensureUser === "function", "ต้องได้ store ที่ใช้งานได้");
  });
```

- [ ] **Step 2: Run to verify failure** — `cd "…/gonai" && npx tsx tests/infra.test.ts`. Expected: FAIL — `resolveStore` is not exported.

- [ ] **Step 3: Implement** — in `lib/store.ts`, replace the final line `export const store: Store = isSupabaseEnabled() ? supabaseStore : jsonStore;` with:

```ts
// เลือก backend ตอน "ใช้" ไม่ใช่ตอน import — next build (NODE_ENV=production) import route
// ทุกตัวโดยไม่มี Supabase env ซึ่งต้องยัง build ผ่าน · แต่ runtime prod ที่ env หาย ต้องตายดังๆ
// ทันทีที่มีใครแตะ store ไม่ใช่ไปตายเงียบๆ ใน fs.writeFileSync บน filesystem read-only ของ Vercel
export function resolveStore(): Store {
  if (isSupabaseEnabled()) return supabaseStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase env missing in production: set SUPABASE_URL + SUPABASE_SERVICE_KEY (JSON store is dev-only)",
    );
  }
  return jsonStore;
}

export const store: Store = new Proxy({} as Store, {
  get(_t, prop) {
    const s = resolveStore();
    const v = s[prop as keyof Store];
    return typeof v === "function" ? v.bind(s) : v;
  },
});
```

- [ ] **Step 4: Verify green** — `npx tsx tests/infra.test.ts` (24 pass), then `npm run check` and `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/store.ts tests/infra.test.ts
git commit -m "prod guard: store facade ปฏิเสธ JSON store ใน production — ตายดังตอนใช้ ไม่ตายเงียบใน Vercel"
```

---

### Task 2: /api/health goes red when prod runs the JSON store

Today health returns 200 with `store:"json"` even in the exact broken state Task 1 guards against — UptimeRobot would stay green while every write 500s. Decision logic goes in a pure lib helper so the tsx harness can test it without importing Next server internals.

**Files:**
- Create: `lib/health.ts`
- Modify: `app/api/health/route.ts`
- Test: `tests/infra.test.ts`

**Interfaces:**
- Produces: `export function healthProblem(env: NodeJS.ProcessEnv, supabaseOn: boolean): string | null` — returns a problem code or null (healthy so far).
- Consumes (route): `healthProblem`, existing `getCatalog`, `isSupabaseEnabled`.

- [ ] **Step 1: Write the failing tests** — append to `tests/infra.test.ts`:

```ts
  // ===== health: prod ห้ามอยู่บน JSON store =====
  await test("health: production + JSON store → มีปัญหา", async () => {
    const { healthProblem } = await import("../lib/health");
    eq(healthProblem({ NODE_ENV: "production" }, false), "json_store_in_production");
  });
  await test("health: production + Supabase / dev + JSON → ปกติ", async () => {
    const { healthProblem } = await import("../lib/health");
    eq(healthProblem({ NODE_ENV: "production" }, true), null);
    eq(healthProblem({ NODE_ENV: "development" }, false), null);
  });
```

- [ ] **Step 2: Verify failure** — `npx tsx tests/infra.test.ts`. Expected: FAIL — cannot find `../lib/health`.

- [ ] **Step 3: Implement** — create `lib/health.ts`:

```ts
// คำตัดสิน health — pure function แยกจาก route เพื่อ test ตรงๆ ได้ (route แค่ห่อ HTTP)
// ปัญหาเดียวที่เช็คตอนนี้: production หลุดมาอยู่บน JSON store (= Supabase env หาย)
export function healthProblem(env: NodeJS.ProcessEnv, supabaseOn: boolean): string | null {
  if (env.NODE_ENV === "production" && !supabaseOn) return "json_store_in_production";
  return null;
}
```

Then rewrite `app/api/health/route.ts` as:

```ts
import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { healthProblem } from "@/lib/health";
import { isSupabaseEnabled } from "@/supabase/store-adapter";

// Health check สำหรับ uptime monitor (เช่น UptimeRobot ฟรี ยิงทุก 5 นาที)
// เช็คว่า catalog โหลดได้จริง — ถ้า Supabase ล่มหรือ config พัง จะตอบ 500
// และถ้า production หลุดมาอยู่บน JSON store (env หาย) → 503 ให้ monitor ร้องทันที
export async function GET() {
  const supa = isSupabaseEnabled();
  const problem = healthProblem(process.env, supa);
  if (problem) {
    return NextResponse.json({ ok: false, store: "json", error: problem }, { status: 503 });
  }
  try {
    const { venues } = await getCatalog();
    return NextResponse.json({
      ok: true,
      store: supa ? "supabase" : "json",
      venues: venues.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Verify green** — `npm run check` + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/health.ts app/api/health/route.ts tests/infra.test.ts
git commit -m "health: production บน JSON store → 503 — UptimeRobot เห็นแดงจริง ไม่เขียวปลอม"
```

---

### Task 3: Deploy config — preflight gates the Vercel build + metadataBase

`next build` happily ships with zero env (audit-verified). Wire `npm run preflight` into Vercel's build command so a missing required var fails the deploy. Also kill the build warning that makes OG share images resolve against localhost.

**Files:**
- Create: `vercel.json`
- Modify: `app/layout.tsx` (metadata export, line ~25)

**Interfaces:**
- Produces: Vercel build = `npm run preflight && npm run build`. Local `npm run build` unchanged.

- [ ] **Step 1: Create `vercel.json`** at repo root:

```json
{
  "buildCommand": "npm run preflight && npm run build"
}
```

- [ ] **Step 2: Add metadataBase** — in `app/layout.tsx`, the metadata export currently begins `export const metadata: Metadata = {` followed by `title:`. Insert above `title`:

```ts
export const metadata: Metadata = {
  // OG/Twitter image URL ต้อง resolve กับโดเมนจริง ไม่ใช่ localhost — ค่าเดียวกับที่ LINE callback ใช้
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "GoNai — plan · go · never over budget",
```

- [ ] **Step 3: Verify** — stop any dev server, `npm run build`. Expected: success AND the `metadataBase property in metadata export is not set` warning is GONE from output. `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add vercel.json app/layout.tsx
git commit -m "deploy: vercel.json บังคับ preflight ก่อน build + metadataBase จาก NEXT_PUBLIC_BASE_URL"
```

---

### Task 4: Chat — Ollama-first in production (ollama.com cloud)

**Klao decision D5 (2026-07-27):** production chat runs on his ollama.com cloud account first; `ANTHROPIC_API_KEY` comes later when user volume justifies it. Two code gaps block that: (1) `parseWithOllama` sends NO `Authorization` header, so it cannot talk to `https://ollama.com` at all (only a local daemon); (2) if Ollama env is NOT set in prod, every message still burns a doomed localhost fetch + `console.error` before the quick parser. Fix both: Bearer support via `OLLAMA_API_KEY`, and prod only tries Ollama when `OLLAMA_URL` is explicitly set. Dev unchanged (localhost daemon, no key). Also pin the route's `maxDuration` so the 20s Ollama timeout fits inside the platform's function limit.

**Files:**
- Modify: `lib/chat.ts` (two helpers), `app/api/chat/route.ts` (headers + fallback chain + maxDuration)
- Test: `tests/infra.test.ts`

**Interfaces:**
- Produces: `export function ollamaAllowed(env: NodeJS.ProcessEnv): boolean` and `export function ollamaHeaders(env: NodeJS.ProcessEnv): Record<string, string>` in `lib/chat.ts`.
- Consumes: existing `parseWithOllama`, `parseQuick`, `result`/`engine` locals in the route.

- [ ] **Step 1: Write the failing tests** — append to `tests/infra.test.ts`:

```ts
  // ===== chat: Ollama engine config (D5 — Ollama-first ใน prod) =====
  await test("chat: prod ไม่ตั้ง OLLAMA_URL → ห้ามลอง Ollama", async () => {
    const { ollamaAllowed } = await import("../lib/chat");
    eq(ollamaAllowed({ NODE_ENV: "production" }), false);
  });
  await test("chat: prod + ตั้ง OLLAMA_URL (ollama.com cloud) → ลองได้", async () => {
    const { ollamaAllowed } = await import("../lib/chat");
    eq(ollamaAllowed({ NODE_ENV: "production", OLLAMA_URL: "https://ollama.com" }), true);
  });
  await test("chat: dev → ลองได้เสมอ (default localhost)", async () => {
    const { ollamaAllowed } = await import("../lib/chat");
    eq(ollamaAllowed({ NODE_ENV: "development" }), true);
  });
  await test("chat: มี OLLAMA_API_KEY → ส่ง Authorization Bearer", async () => {
    const { ollamaHeaders } = await import("../lib/chat");
    const h = ollamaHeaders({ OLLAMA_API_KEY: "sk-test" });
    eq(h.Authorization, "Bearer sk-test");
    eq(h["Content-Type"], "application/json");
  });
  await test("chat: ไม่มี OLLAMA_API_KEY → ไม่มี Authorization (local daemon)", async () => {
    const { ollamaHeaders } = await import("../lib/chat");
    eq("Authorization" in ollamaHeaders({}), false);
  });
```

- [ ] **Step 2: Verify failure** — `npx tsx tests/infra.test.ts`. Expected: FAIL — `ollamaAllowed`/`ollamaHeaders` not exported.

- [ ] **Step 3: Implement helpers** — in `lib/chat.ts`, add (top-level, near other exports):

```ts
// D5 (Klao 2026-07-27): prod ใช้ Ollama cloud ก่อน (ollama.com) — ANTHROPIC_API_KEY ค่อยเปิดเมื่อผู้ใช้เยอะ
// prod ลอง Ollama ต่อเมื่อตั้ง OLLAMA_URL เองเท่านั้น (Vercel ไม่มี localhost daemon)
// dev ลองได้เสมอ (default localhost:11434 ของเครื่อง Klao)
export function ollamaAllowed(env: NodeJS.ProcessEnv): boolean {
  return !!env.OLLAMA_URL || env.NODE_ENV !== "production";
}

// ollama.com cloud ต้องมี Bearer key — local daemon ไม่ต้อง (key ไม่ตั้ง = ไม่ส่ง header)
export function ollamaHeaders(env: NodeJS.ProcessEnv): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.OLLAMA_API_KEY) h.Authorization = `Bearer ${env.OLLAMA_API_KEY}`;
  return h;
}
```

- [ ] **Step 4: Use them in the route** — in `app/api/chat/route.ts`, three edits: (a) import `ollamaAllowed, ollamaHeaders` from `@/lib/chat` (extend the existing `lib/chat` import); (b) below the imports add:

```ts
// Vercel: เผื่อเวลา function ให้ครอบ Ollama timeout 20s (default บางแผน 10s ไม่พอ)
export const maxDuration = 30;
```

(c) in `parseWithOllama`, replace `headers: { "Content-Type": "application/json" },` with `headers: ollamaHeaders(process.env),`; (d) replace the outer `catch` block of the engine chain (currently `} catch {` → inner try Ollama → catch → quick) with:

```ts
  } catch {
    if (!ollamaAllowed(process.env)) {
      // prod ที่ไม่ได้ตั้ง OLLAMA_URL — ไม่มีทางมี Ollama ให้ลอง ข้ามไป quick เลย (ไม่เปลือง fetch + log)
      result = { ...parseQuick(message), source: "quick" };
    } else {
      try {
        result = { ...(await parseWithOllama(message, current)), source: "ai" };
        engine = "ollama";
      } catch (e) {
        // Ollama ไม่รัน / โมเดลไม่มี / timeout / ตอบไม่เป็น JSON — quick parser รับช่วง
        // log สาเหตุไว้ฝั่ง server เสมอ (ผู้ใช้ไม่เห็น) — fallback เงียบสนิทเคยทำให้ debug ไม่ได้
        console.error("[chat] ollama fallback:", e instanceof Error ? e.message : e);
        result = { ...parseQuick(message), source: "quick" };
      }
    }
  }
```

- [ ] **Step 5: Verify green** — `npm run check` + `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add lib/chat.ts app/api/chat/route.ts tests/infra.test.ts
git commit -m "chat: Ollama-first prod (D5) — Bearer key สำหรับ ollama.com + ข้าม Ollama เมื่อไม่ตั้ง URL + maxDuration 30s"
```

---

### Task 5: LINE login — slash-proof redirect_uri + visible auth_error

Two audit findings: a trailing slash on `NEXT_PUBLIC_BASE_URL` yields `//api/...` which will never match the URL registered in LINE Console; and all four `auth_error` redirects (`not_configured`, `line`, `bad_state`, `exchange_failed`) land on `/app/me` where nothing reads them — silent no-op for the user.

**Files:**
- Modify: `lib/auth.ts` (`lineRedirectUri`, line ~103), `app/app/me/page.tsx`
- Test: `tests/infra.test.ts`

**Interfaces:**
- Consumes: `getLineLoginUrl` (already exported from `lib/auth.ts`), `useToast` (me page already has `const showToast = useToast();` at line ~84), `useRouter` (imported; add `const router = useRouter();` in the component if not already instantiated — grep first).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test** — append to `tests/infra.test.ts`:

```ts
  // ===== line: redirect_uri ต้องกัน trailing slash =====
  await test("line: NEXT_PUBLIC_BASE_URL มี trailing slash → redirect_uri ไม่มี //", async () => {
    const prevBase = process.env.NEXT_PUBLIC_BASE_URL;
    const prevId = process.env.LINE_CHANNEL_ID;
    try {
      process.env.NEXT_PUBLIC_BASE_URL = "https://gonai.example.com/";
      process.env.LINE_CHANNEL_ID = "test-channel";
      const { getLineLoginUrl } = await import("../lib/auth");
      const url = new URL(getLineLoginUrl("/app"));
      eq(url.searchParams.get("redirect_uri"), "https://gonai.example.com/api/auth/line/callback");
    } finally {
      if (prevBase === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
      else process.env.NEXT_PUBLIC_BASE_URL = prevBase;
      if (prevId === undefined) delete process.env.LINE_CHANNEL_ID;
      else process.env.LINE_CHANNEL_ID = prevId;
    }
  });
```

- [ ] **Step 2: Verify failure** — expected: got `https://gonai.example.com//api/auth/line/callback`.

- [ ] **Step 3: Fix `lineRedirectUri`** — in `lib/auth.ts` replace the function with:

```ts
function lineRedirectUri(): string {
  // ตัด trailing slash — "https://โดเมน/" ที่ copy มาจาก browser จะกลาย //api/... แล้ว LINE reject
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/auth/line/callback`;
}
```

- [ ] **Step 4: Surface auth_error on /app/me** — in `app/app/me/page.tsx`: add `useEffect` to the react import (`import { useEffect, useState } from "react";`), ensure `const router = useRouter();` exists in the component, then add after `const showToast = useToast();`:

```ts
  // auth_error จาก LINE redirect (not_configured / line / bad_state / exchange_failed)
  // เดิมไม่มีใครอ่าน — ผู้ใช้กดปุ่มแล้วหน้าเด้งกลับเฉยๆ · อ่านจาก window ตรงๆ เลี่ยง
  // useSearchParams ที่บังคับ Suspense boundary ตอน build
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("auth_error");
    if (!err) return;
    showToast(
      err === "not_configured"
        ? "LINE sign-in isn't available yet — everything still works as guest"
        : "LINE sign-in didn't go through — please try again",
    );
    router.replace("/app/me"); // ล้าง query กัน toast เด้งซ้ำ
  }, [router, showToast]);
```

- [ ] **Step 5: Verify green** — `npm run check` + `npx tsc --noEmit`. Manual spot check: `PORT=3010 npm run dev`, open `http://localhost:3010/app/me?auth_error=not_configured` → toast appears once, URL cleans itself.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/app/me/page.tsx tests/infra.test.ts
git commit -m "line: กัน trailing slash ใน redirect_uri + auth_error โชว์ toast จริง ไม่เงียบ"
```

---

### Task 6: `bus` leg mode — end to end

FIELD-CHECKLIST decision #2, pre-authorized by Klao ("งานโค้ด ~5 บรรทัด สั่งได้เลย"). The Pinklao route is a real city bus (สาย 79/511) currently faked as `van`. Critical extra: the generator does NO mode validation and `tsx` does not type-check (audit-proven), so a field-day typo in the mode column would silently produce a broken `lib/fixtures.ts` that only dies at `next build`. Add a runtime whitelist.

**Files:**
- Modify: `lib/types.ts` (LegMode ~line 52, MODE_LABELS ~line 134), `components/RouteLegs.tsx` (MODE_EMOJI ~line 7), `tests/csv-to-fixtures.ts` (header comment line 7 + `legTS`), `data/w2/routes.csv` (line 15), `data/w2/FIELD-CHECKLIST.md` (decision #2)
- Test: `tests/pipeline.test.ts`

**Interfaces:**
- Produces: `"bus"` as a valid `LegMode` everywhere; generator exits 1 on any mode outside `walk|win|boat|bts|mrt|songthaew|van|bus|grab`.

- [ ] **Step 1: Write the failing tests** — append to `tests/pipeline.test.ts` inside `main()` (uses existing `mkTmpDir`, `runGenerator`, `VALID_VENUES_CSV`, `VALID_ROUTES_CSV` helpers):

```ts
  // ===== mode whitelist (tsx ไม่เช็ค type — generator ต้องกันเอง) =====
  await test("generator: mode นอก whitelist → exit 1 บอกชื่อ mode", () => {
    const dir = mkTmpDir();
    const v = path.join(dir, "v.csv");
    const r = path.join(dir, "r.csv");
    fs.writeFileSync(v, VALID_VENUES_CSV);
    fs.writeFileSync(r, VALID_ROUTES_CSV.replace(",win,", ",jetski,"));
    const res = runGenerator(v, r);
    eq(res.status, 1);
    ok(res.stderr.includes("jetski"), "stderr ต้องบอก mode ที่ผิด");
  });

  await test("generator: mode bus ผ่าน", () => {
    const dir = mkTmpDir();
    const v = path.join(dir, "v.csv");
    const r = path.join(dir, "r.csv");
    fs.writeFileSync(v, VALID_VENUES_CSV);
    fs.writeFileSync(r, VALID_ROUTES_CSV.replace(",win,", ",bus,"));
    const res = runGenerator(v, r);
    eq(res.status, 0, res.stderr);
  });

  await test("w2 จริง: data/w2/*.csv ผ่าน generator (กัน field-day แก้ CSV แล้วพังเงียบ)", () => {
    const res = runGenerator("data/w2/venues.csv", "data/w2/routes.csv");
    eq(res.status, 0, res.stderr);
  });
```

- [ ] **Step 2: Verify failure** — `npx tsx tests/pipeline.test.ts`. Expected: the "mode นอก whitelist" test FAILS (generator currently exits 0 on jetski) — that is the red anchor. The other two pass today and pin the target state.

- [ ] **Step 3: Extend the enum** — `lib/types.ts`: add `| "bus"` to `LegMode` (after `| "van"`), and add `bus: "Bus",` to `MODE_LABELS` (after `van: "Van",`). tsc enforces the MODE_LABELS entry.

- [ ] **Step 4: Emoji** — `components/RouteLegs.tsx` `MODE_EMOJI`: add `bus: "🚌",` after `van: "🚐",`. (This map is `Record<string, string>` — NOT compiler-enforced; without this line a bus leg renders "•".)

- [ ] **Step 5: Generator whitelist** — in `tests/csv-to-fixtures.ts`: update the header comment's mode list (line ~7) to `mode (walk|win|boat|bts|mrt|songthaew|van|bus|grab)`, then add above `legTS`:

```ts
// tsx (npm run check) ไม่ type-check — ค่า mode มั่วจาก CSV จะรอดถึง next build ถ้าไม่กันตรงนี้
const LEG_MODES = new Set(["walk", "win", "boat", "bts", "mrt", "songthaew", "van", "bus", "grab"]);
```

and at the top of `legTS(routeId, l)`:

```ts
  if (!LEG_MODES.has(l.mode)) {
    console.error(
      `route ${routeId}: mode "${l.mode}" ไม่อยู่ในชุดที่รองรับ (${[...LEG_MODES].join("|")})`,
    );
    process.exit(1);
  }
```

- [ ] **Step 6: Real data** — `data/w2/routes.csv` line 15: change `,van,` to `,bus,` so the row reads `R107,pinklao,siam,cheapest,2,bus,City bus 79 or 511 to Siam,17,24,35,Bus line numbers change often — verify at the stop`. In `data/w2/FIELD-CHECKLIST.md`, rewrite decision #2's line to state it is resolved: `~~โหมด bus~~ **ตัดสินแล้ว 2026-07-27**: เพิ่ม bus ใน enum + MODE_LABELS + emoji + generator whitelist แล้ว — R107 ใช้ mode=bus จริง`.

- [ ] **Step 6b: Decision D3 (SEA LIFE price)** — in `data/w2/venues.csv` row V108: change `price_per_head_max` from `1290` to `990` (Klao decided 2026-07-27: show the online price 690–990 — it's what a plan-ahead user actually pays; `price_per_head_min` stays 690). In `data/w2/FIELD-CHECKLIST.md`, mark decision #3 resolved: `~~SEA LIFE ราคาไหน~~ **ตัดสินแล้ว 2026-07-27**: โชว์ราคา online 690–990 (ตรง promise "รู้งบก่อนออกจากบ้าน") — field day เช็คว่าราคา online ยังจริง + จดราคา gate ไว้ประกอบ`.

- [ ] **Step 7: Verify green** — `npx tsx tests/pipeline.test.ts` (17 pass), `npm run check`, `npx tsc --noEmit`.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts components/RouteLegs.tsx tests/csv-to-fixtures.ts data/w2/routes.csv data/w2/venues.csv data/w2/FIELD-CHECKLIST.md tests/pipeline.test.ts
git commit -m "w2: เพิ่มโหมด bus ครบวงจร + generator ตรวจ mode whitelist + SEA LIFE ใช้ราคา online (D3)"
```

---

### Task 7: `seed --csv` — a truthful path from data/w2 CSVs into Supabase

Audit blocker: `seed.ts --w2` seeds the OLD 24-venue mock (`tests/w2-data.ts`), not the real CSVs — a naming trap Klao would very plausibly fall into on launch day. The only real path today overwrites `lib/fixtures.ts` by hand. Fix: seed gains `--csv <venues> <routes>` (runs the generator with all its guards, imports the result via a temp module — the exact technique `tests/pipeline.test.ts` already uses) and `--dry` (validate + count, never write, no env needed). `--w2` is retired with a pointed error.

**Files:**
- Rewrite: `supabase/seed.ts`
- Modify: `package.json` (scripts), `.gitignore`
- Test: `tests/pipeline.test.ts`

**Interfaces:**
- Produces: CLI contract — `tsx supabase/seed.ts` (fixtures), `tsx supabase/seed.ts --csv <v> <r>` (CSV path), `--dry` modifier, `--w2` → exit 1 with pointer. npm scripts `seed`, `seed:w2`, `fixtures:w2`.
- Consumes: `tests/csv-to-fixtures.ts` CLI (unchanged), `upsertCatalog`/`isSupabaseEnabled` from `supabase/store-adapter.ts`.

- [ ] **Step 1: Write the failing tests** — append to `tests/pipeline.test.ts`, adding this helper next to `runGenerator`:

```ts
// รัน seed CLI — ใช้เฉพาะ --dry / --w2 ใน test เท่านั้น (ห้ามมีทางไปแตะ Supabase จริง)
function runSeed(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node_modules/.bin/tsx", ["supabase/seed.ts", ...args], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}
```

and the tests:

```ts
  // ===== seed CLI =====
  await test("seed: --w2 ถูกถอด → exit 1 ชี้ทางไป --csv", () => {
    const r = runSeed(["--w2"]);
    eq(r.status, 1);
    ok(r.stderr.includes("--csv"), "ต้องชี้ทางไป --csv");
  });

  await test("seed: --csv w2 จริง --dry → นับ 21 venues / 12 routes โดยไม่แตะ Supabase", () => {
    const r = runSeed(["--csv", "data/w2/venues.csv", "data/w2/routes.csv", "--dry"]);
    eq(r.status, 0, r.stderr);
    ok(r.stdout.includes("21 venues"), `stdout: ${r.stdout}`);
    ok(r.stdout.includes("12 routes"), `stdout: ${r.stdout}`);
  });
```

- [ ] **Step 2: Verify failure** — `npx tsx tests/pipeline.test.ts`. Expected: both new tests FAIL (`--w2` currently proceeds to the env check; `--csv` is unknown).

- [ ] **Step 3: Rewrite `supabase/seed.ts`** in full:

```ts
// Seed catalog (zones/venues/routes) ลง Supabase
//
//   npx tsx supabase/seed.ts                                 → ใช้ lib/fixtures.ts (catalog ที่ commit อยู่)
//   npx tsx supabase/seed.ts --csv <venues.csv> <routes.csv> → แปลง CSV ผ่าน generator (guards ครบ) แล้ว seed
//   เติม --dry → ตรวจ + นับอย่างเดียว ไม่เขียน Supabase (ไม่ต้องมี env ด้วย)
//
// ทางลัด: npm run seed:w2 = --csv data/w2/venues.csv data/w2/routes.csv
// ต้องมี SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env (script โหลด .env ให้เอง)
// รัน supabase/schema.sql ใน SQL Editor ก่อนครั้งแรก
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// tsx ไม่โหลด .env ให้ — parse เองแบบง่าย (KEY=VALUE ต่อบรรทัด)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// generator เดียวกับ pipeline ทุกประการ (guards: NaN / route_id ชน / mode whitelist) →
// เขียน module ชั่วคราวใน lib/ ให้ "./types" resolve แล้ว dynamic import — เทคนิคเดียวกับ pipeline.test.ts
async function catalogFromCsv(venuesCsv: string, routesCsv: string) {
  const out = execFileSync(
    "node_modules/.bin/tsx",
    ["tests/csv-to-fixtures.ts", venuesCsv, routesCsv],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }, // stderr guard ทะลุถึงคนรัน
  );
  const tmp = path.join("lib", ".seed-tmp-fixtures.ts");
  fs.writeFileSync(tmp, out);
  try {
    const mod = await import(pathToFileURL(path.resolve(tmp)).href);
    return { zones: mod.ZONES, venues: mod.VENUES, routes: mod.ROUTES };
  } finally {
    fs.unlinkSync(tmp);
  }
}

async function main() {
  if (process.argv.includes("--w2")) {
    console.error(
      "--w2 ถูกถอดแล้ว — มันเคยชี้ mock เก่า (tests/w2-data.ts) ไม่ใช่ข้อมูลจริง\n" +
        "ใช้: npm run seed:w2  หรือ  npx tsx supabase/seed.ts --csv data/w2/venues.csv data/w2/routes.csv",
    );
    process.exit(1);
  }

  const dry = process.argv.includes("--dry");
  const csvIdx = process.argv.indexOf("--csv");
  let catalog;
  let label;
  if (csvIdx !== -1) {
    const venuesCsv = process.argv[csvIdx + 1];
    const routesCsv = process.argv[csvIdx + 2];
    if (!venuesCsv || !routesCsv || venuesCsv.startsWith("--") || routesCsv.startsWith("--")) {
      console.error("--csv ต้องตามด้วย <venues.csv> <routes.csv>");
      process.exit(1);
    }
    catalog = await catalogFromCsv(venuesCsv, routesCsv);
    label = `csv: ${venuesCsv}`;
  } else {
    const { ROUTES, VENUES, ZONES } = await import("../lib/fixtures");
    catalog = { zones: ZONES, venues: VENUES, routes: ROUTES };
    label = "fixtures";
  }

  const counts = `${catalog.zones.length} zones, ${catalog.venues.length} venues, ${catalog.routes.length} routes`;
  if (dry) {
    console.log(`dry run (${label}): ${counts} — ไม่เขียน Supabase`);
    return;
  }

  const { isSupabaseEnabled, upsertCatalog } = await import("./store-adapter");
  if (!isSupabaseEnabled()) {
    console.error("ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env ก่อน");
    process.exit(1);
  }
  await upsertCatalog(catalog);
  console.log(`seed สำเร็จ (${label}): ${counts}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: npm scripts + gitignore** — in `package.json` scripts add (after `"preflight"`):

```json
    "seed": "tsx supabase/seed.ts",
    "seed:w2": "tsx supabase/seed.ts --csv data/w2/venues.csv data/w2/routes.csv",
    "fixtures:w2": "tsx tests/csv-to-fixtures.ts data/w2/venues.csv data/w2/routes.csv > lib/fixtures.ts",
```

In `.gitignore`, below `lib/.pipeline-tmp-fixtures.ts` add `lib/.seed-tmp-fixtures.ts`.

- [ ] **Step 5: Verify green** — `npx tsx tests/pipeline.test.ts` (19 pass), `npm run check`, `npx tsc --noEmit`. Also run `npm run seed:w2 -- --dry` manually once: expect `dry run (csv: data/w2/venues.csv): 7 zones, 21 venues, 12 routes — ไม่เขียน Supabase`.

- [ ] **Step 6: Commit**

```bash
git add supabase/seed.ts package.json .gitignore tests/pipeline.test.ts
git commit -m "seed: --csv เสียบ CSV จริงลง Supabase + --dry ซ้อมมือ — ถอด --w2 ที่หลอกว่าเป็นข้อมูลจริง"
```

---

### Task 8: TrustBadge stops saying "Confirmed by 0 travelers"

Every W2 row launches with `validation_count=0`; the current badge renders a green check pill "Confirmed by 0 travelers" — actively misleading. Extract the state decision into a pure lib function (testable in the tsx harness) and add an honest "unverified" state.

**Files:**
- Create: `lib/trust.ts`
- Modify: `components/TrustBadge.tsx`
- Test: `tests/infra.test.ts`

**Interfaces:**
- Produces:

```ts
export type TrustState =
  | { kind: "stale"; days: number }
  | { kind: "unverified"; days: number }
  | { kind: "confirmed"; days: number; dots: number };
export function trustState(lastValidatedAt: string, count: number, now: number, staleDays: number): TrustState;
```

- Consumes (component): `STALE_DAYS` from `@/lib/fixtures` (existing).

- [ ] **Step 1: Write the failing tests** — append to `tests/infra.test.ts`:

```ts
  // ===== trust badge state =====
  await test("trust: เก่ากว่า staleDays → stale ชนะทุกอย่าง", async () => {
    const { trustState } = await import("../lib/trust");
    eq(trustState("2026-05-01", 5, Date.parse("2026-07-27"), 45).kind, "stale");
  });
  await test("trust: count 0 + ยังสด → unverified ไม่ใช่ confirmed", async () => {
    const { trustState } = await import("../lib/trust");
    eq(trustState("2026-07-27", 0, Date.parse("2026-07-27"), 45).kind, "unverified");
  });
  await test("trust: count 1 → confirmed dots 1", async () => {
    const { trustState } = await import("../lib/trust");
    const st = trustState("2026-07-20", 1, Date.parse("2026-07-27"), 45);
    ok(st.kind === "confirmed" && st.dots === 1, `got ${JSON.stringify(st)}`);
  });
  await test("trust: count 7 → dots cap ที่ 3", async () => {
    const { trustState } = await import("../lib/trust");
    const st = trustState("2026-07-20", 7, Date.parse("2026-07-27"), 45);
    ok(st.kind === "confirmed" && st.dots === 3, `got ${JSON.stringify(st)}`);
  });
```

- [ ] **Step 2: Verify failure** — cannot find `../lib/trust`.

- [ ] **Step 3: Implement `lib/trust.ts`:**

```ts
// สถานะป้ายความเชื่อมั่น — pure function แยกจาก TrustBadge เพื่อ test ตรง
// ลำดับตัดสิน: stale (เกิน staleDays) > unverified (count 0) > confirmed
export type TrustState =
  | { kind: "stale"; days: number }
  | { kind: "unverified"; days: number }
  | { kind: "confirmed"; days: number; dots: number };

export function trustState(
  lastValidatedAt: string,
  count: number,
  now: number,
  staleDays: number,
): TrustState {
  const days = Math.max(0, Math.floor((now - new Date(lastValidatedAt).getTime()) / 86_400_000));
  if (days > staleDays) return { kind: "stale", days };
  if (count < 1) return { kind: "unverified", days };
  return { kind: "confirmed", days, dots: Math.min(3, count) };
}
```

- [ ] **Step 4: Rewire the component** — `components/TrustBadge.tsx` becomes:

```tsx
// Trust badge — social proof จากข้อมูล validate จริง (แก้ AI trust gap · stale ที่ 45 วันตาม Gap Fix D)
// 3 สถานะจาก lib/trust.ts: stale / unverified (count 0 — ห้ามโชว์ "Confirmed by 0") / confirmed
import { STALE_DAYS } from "@/lib/fixtures";
import { trustState } from "@/lib/trust";

export default function TrustBadge({ lastValidatedAt, count }: { lastValidatedAt: string; count: number }) {
  const state = trustState(lastValidatedAt, count, Date.now(), STALE_DAYS);

  if (state.kind === "stale") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid/60 px-2.5 py-1 text-[11px] text-mut">
        Last checked {state.days}d ago — reconfirming
      </span>
    );
  }

  if (state.kind === "unverified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid/60 px-2.5 py-1 text-[11px] text-mut">
        New spot — not traveler-confirmed yet
      </span>
    );
  }

  // วงกลม ✓ ซ้อนกันแทน avatar — เราไม่มีรูปผู้ใช้จริง เลยไม่แกล้งทำเป็นมี
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-tint px-2.5 py-1 text-[11.5px] font-semibold text-accent">
      <span className="flex -space-x-1.5" aria-hidden>
        {Array.from({ length: state.dots }).map((_, i) => (
          <span
            key={i}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-bg bg-accent text-[8px] text-bg"
            style={{ opacity: 1 - i * 0.25 }}
          >
            ✓
          </span>
        ))}
      </span>
      Confirmed by {count} traveler{count === 1 ? "" : "s"}
      <span className="font-normal text-accent/70">· {state.days}d ago</span>
    </span>
  );
}
```

- [ ] **Step 5: Verify green** — `npm run check` + `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add lib/trust.ts components/TrustBadge.tsx tests/infra.test.ts
git commit -m "trust badge: validation_count=0 → ป้าย unverified ตรงไปตรงมา — เลิกโชว์ Confirmed by 0 travelers"
```

---

### Task 9: `imports(user_id)` index

`importsOf` filters on `user_id` but only `status` is indexed — the one table inconsistent with its siblings (plans/saves/events all index user_id). No production DB exists yet, so edit BOTH schema files (they are byte-identical by contract).

**Files:**
- Modify: `supabase/schema.sql`, `supabase/migrations/20260720000000_init.sql`

- [ ] **Step 1:** In both files, directly under the existing `idx_imports_status` index line, add:

```sql
create index if not exists idx_imports_user_id on public.imports(user_id);
```

- [ ] **Step 2: Verify identity** — `diff supabase/schema.sql supabase/migrations/20260720000000_init.sql` → no output.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql supabase/migrations/20260720000000_init.sql
git commit -m "schema: index imports(user_id) — ตารางเดียวที่ตกจาก pattern พี่น้อง"
```

---

### Task 10: npm audit fix (3 highs in next/postcss/sharp)

Audit found 3 high-severity advisories, all fixable inside current semver ranges.

**Files:**
- Modify: `package-lock.json` (and possibly `package.json` patch ranges)

- [ ] **Step 1:** `npm audit fix` (NEVER `--force`). If anything remains unfixed within semver, report it in the commit body and move on — do not force-upgrade majors.
- [ ] **Step 2:** Re-run all gates: `npm run check`, `npx tsc --noEmit`, `npm run build` (stop dev server first).
- [ ] **Step 3:** `npm audit --omit=dev` → confirm high count dropped; record the number in the commit message.
- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: npm audit fix — ปิด high ใน next/postcss/sharp (เหลือ <N> ตามหมายเหตุ)"
```

---

### Task 11: Docs — LAUNCH-RUNBOOK.md + PLAN.md refresh

Everything code-side is now true; make the docs match. The runbook is Klao's step-by-step for all external work — it must be executable by a tired human at 23:00 without reading any source code.

**Files:**
- Create: `docs/LAUNCH-RUNBOOK.md`
- Modify: `PLAN.md` (คำสั่ง section + "ขั้น deploy จริง" section)

- [ ] **Step 1: Create `docs/LAUNCH-RUNBOOK.md`** with exactly this content:

```markdown
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
6. seed ชั่วคราวสำหรับทดสอบระบบ: `npm run seed` (fixtures placeholder 6 ร้าน) — พอไว้ smoke test
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
```

- [ ] **Step 2: Update `PLAN.md`** — in the คำสั่ง (commands) section: add `npm run seed`, `npm run seed:w2` (+ `-- --dry`), `npm run fixtures:w2`; remove the stale `npx tsx supabase/seed.ts --w2` line. In "### ขั้น deploy จริง (เหลือทำ)": replace the manual steps with a pointer to `docs/LAUNCH-RUNBOOK.md` plus a note that vercel.json now enforces preflight at build. In the RouteLeg mode list under Data Model, add `bus`.

- [ ] **Step 3: Verify** — `npm run check` still green; manually re-run `npm run seed:w2 -- --dry` and confirm output matches what the runbook promises.

- [ ] **Step 4: Commit**

```bash
git add docs/LAUNCH-RUNBOOK.md PLAN.md
git commit -m "docs: LAUNCH-RUNBOOK ฉบับทำตามได้จริง + PLAN.md ตามโค้ดล่าสุด (seed:w2/fixtures:w2/bus)"
```

---

### Task 12: Final verification sweep

- [ ] **Step 1:** `npm run check` — expect ~99 tests (82 + ~17 new), 0 fail. Record exact count.
- [ ] **Step 2:** `npx tsc --noEmit` — clean.
- [ ] **Step 3:** Stop any dev server → `npm run build` — green, no metadataBase warning.
- [ ] **Step 4:** `PORT=3010 npm run dev` in background → `GN_BASE_URL=http://localhost:3010 npm run journey` — 20/20 steps, 0 console errors. (TrustBadge/chat/me-page changes are all on pages the journey already covers.)
- [ ] **Step 5:** `npm run seed:w2 -- --dry` one last time — `21 venues, 12 routes`.
- [ ] **Step 6:** If any step failed: fix, re-run the failed gate, and only then declare done. Report the final numbers (tests, journey steps, build sizes) back to Klao verbatim.

---

## Klao decisions (answered 2026-07-27 unless marked OPEN)

| # | Decision | Ruling |
|---|---|---|
| D1 | validation_count policy after field day | **DECIDED: founder-verified = 3** — gems live day 1; rows not personally verified stay 0 (runbook §5) |
| D2 | `bus` mode | RESOLVED by Task 6 (pre-authorized in FIELD-CHECKLIST) |
| D3 | SEA LIFE price shown | **DECIDED: online 690–990** — Task 6 Step 6b updates the CSV; field day re-verifies |
| D4 | Waitlist vs PDPA wipe | recommendation stands: leave separate (own consent at collection); manual delete on request — runbook notes it |
| D5 | Prod chat engine | **DECIDED: Ollama-first** via ollama.com cloud (`OLLAMA_URL`+`OLLAMA_API_KEY`+`OLLAMA_MODEL`, Task 4) — `ANTHROPIC_API_KEY` later at scale; setting it any day makes Claude the first engine automatically, no code change |
| D6 | Domain | **OPEN** — needed before runbook §2 (`NEXT_PUBLIC_BASE_URL`, LINE callback) |

## Out of scope (known, deliberately not in this plan)

- planner-client.tsx 810→≤550 split follow-up · first-Tab-skips-30-controls on /app (Klao deferred both)
- Upstash rate limit · events retention job · composite events index (all "when numbers argue")
- RLS `app.user_id` wiring (no anon-key client exists)
- Dark mode (Klao's standing order: skipped)
- Deferred minors from sweep ledgers (explore 🎒 emoji, toast/budget-pill overlap <640px, silent-null act() UX, `plugs:""` in template row V012)

## Self-review (done at write time)

- Spec coverage: all 5 audit areas → deploy-env (T1-T4), supabase (T7, T9, runbook), line-auth (T5, runbook §3), w2-data (T6, T7, T8, runbook §5-6), gates (T10, T12). Every audit blocker has a task; every gap is a task, a runbook note, or explicitly out-of-scope.
- Placeholders: none — every step has literal code/commands/content.
- Type consistency: `resolveStore`/`healthProblem`/`ollamaAllowed`/`trustState` signatures match between Interfaces blocks, implementation code, and test code. `runSeed` matches `runGenerator` conventions in the same file.
