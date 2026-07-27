// infra.test.ts — tests สำหรับชั้น infrastructure (auth cookie, rate limit, catalog)
// รันด้วย: npm run check (ต่อจาก logic.test.ts)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { guarded } from "../lib/api-guard";
import { decodeUid, encodeUid, verifyLineState } from "../lib/auth";
import { getCatalog } from "../lib/catalog";
import { applyVenueFilters } from "../lib/filters";
import { VENUES } from "../lib/fixtures";
import { preflightChecks } from "../lib/preflight";
import { rateLimit, resetRateLimits } from "../lib/ratelimit";
import { analyzeRain } from "../lib/weather";
import { W2_VENUES } from "./w2-data";

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

async function main() {
  // ===== auth: signed cookie =====
  await test("auth: encode → decode roundtrip (anonymous)", () => {
    const d = decodeUid(encodeUid("abc-123", "anonymous"));
    eq(d?.id, "abc-123");
    eq(d?.provider, "anonymous");
  });

  await test("auth: encode → decode roundtrip (line)", () => {
    const d = decodeUid(encodeUid("U1234567890", "line"));
    eq(d?.id, "U1234567890");
    eq(d?.provider, "line");
  });

  await test("auth: cookie ถูกแก้ id → ปฏิเสธ", () => {
    const cookie = encodeUid("abc-123", "anonymous");
    const tampered = cookie.replace("abc-123", "victim-9");
    eq(decodeUid(tampered), null);
  });

  await test("auth: เปลี่ยน provider ใน cookie → ปฏิเสธ", () => {
    const cookie = encodeUid("abc-123", "anonymous");
    eq(decodeUid(cookie.replace("anonymous:", "line:")), null);
  });

  await test("auth: cookie ไม่มีลายเซ็น/ขยะ → ปฏิเสธ", () => {
    eq(decodeUid("anonymous:abc-123"), null);
    eq(decodeUid("garbage"), null);
    eq(decodeUid(undefined), null);
  });

  await test("auth: LINE state ปลอม → ปฏิเสธ", () => {
    eq(verifyLineState("fake.state"), null);
    eq(verifyLineState(null), null);
  });

  // ===== rate limit =====
  await test("ratelimit: ปล่อยผ่านตาม limit แล้วตัด", () => {
    resetRateLimits();
    eq(rateLimit("t1", 3, 60_000), true);
    eq(rateLimit("t1", 3, 60_000), true);
    eq(rateLimit("t1", 3, 60_000), true);
    eq(rateLimit("t1", 3, 60_000), false, "ครั้งที่ 4 ต้องโดนตัด");
  });

  await test("ratelimit: คนละ key ไม่กระทบกัน", () => {
    resetRateLimits();
    eq(rateLimit("a", 1, 60_000), true);
    eq(rateLimit("b", 1, 60_000), true);
    eq(rateLimit("a", 1, 60_000), false);
  });

  // ===== catalog =====
  await test("catalog: ไม่มี Supabase env → fallback เป็น fixtures", async () => {
    const c = await getCatalog();
    if (c.venues.length < 5) throw new Error(`venues น้อยผิดปกติ: ${c.venues.length}`);
    if (!c.zones.find((z) => z.id === "siam")) throw new Error("ไม่มีโซนสยาม");
    if (!c.routes.length) throw new Error("ไม่มี routes");
  });

  // ===== api-guard: กันชนชั้นนอกสุด API route (launch audit 2026-07-27, finding 1) =====
  await test("api-guard: handler สำเร็จ → response ผ่านไม่แก้ไข", async () => {
    const h = guarded(async (req: Request) => {
      eq(req.url, "http://x/");
      return new Response(JSON.stringify({ ok: true, hello: "world" }), { status: 200 });
    });
    const res = await h(new Request("http://x"));
    eq(res.status, 200);
    const body = (await res.json()) as { ok: boolean; hello: string };
    eq(body.ok, true);
    eq(body.hello, "world");
  });

  await test("api-guard: handler throw → 503 backend_unavailable", async () => {
    const h = guarded(async (_req: Request) => {
      throw new Error("supabase unreachable");
    });
    const res = await h(new Request("http://x"));
    eq(res.status, 503);
    const body = (await res.json()) as { ok: boolean; error: string };
    eq(body.ok, false);
    eq(body.error, "backend_unavailable");
  });

  // ===== weather (pure) =====
  await test("weather: ฝน ≥50% ช่วงบ่าย → rainExpected + peakHour ถูก", () => {
    const times = Array.from({ length: 24 }, (_, h) => `2026-07-20T${String(h).padStart(2, "0")}:00`);
    const probs = times.map((_, h) => (h === 17 ? 70 : h === 15 ? 40 : 10));
    const r = analyzeRain(times, probs, 10);
    eq(r.rainExpected, true);
    eq(r.maxProb, 70);
    eq(r.peakHour, 17);
  });

  await test("weather: ฝนแรงเฉพาะช่วงที่ผ่านไปแล้ว → ไม่เตือน", () => {
    const times = Array.from({ length: 24 }, (_, h) => `2026-07-20T${String(h).padStart(2, "0")}:00`);
    const probs = times.map((_, h) => (h === 9 ? 90 : 10));
    const r = analyzeRain(times, probs, 14); // ตอนนี้บ่ายสองแล้ว — ฝนเช้าไม่เกี่ยว
    eq(r.rainExpected, false);
    eq(r.peakHour, null);
  });

  // ===== filters (pure) =====
  await test("filters: indoor กรอง outdoor ออกจริง", () => {
    const out = applyVenueFilters(VENUES, { indoor: true });
    eq(out.every((v) => v.attributes.indoor), true);
    if (out.length === VENUES.length) throw new Error("fixtures ต้องมี outdoor อย่างน้อย 1 ที่ให้กรองออก");
  });

  await test("filters: quiet + plugs ทำงานร่วมกัน (AND)", () => {
    const out = applyVenueFilters(VENUES, { quiet: true, plugs: true });
    eq(out.every((v) => v.attributes.noise === "quiet" && v.attributes.plugs !== "none"), true);
  });

  await test("filters: ไม่ส่ง filter = ได้ครบทุกที่", () => {
    eq(applyVenueFilters(VENUES, {}).length, VENUES.length);
  });

  // ===== w2 data sanity (ก่อนใช้ seed staging) =====
  await test("w2-data: id ไม่ซ้ำ และ pool ใหญ่กว่า fixtures เดิม", () => {
    const ids = new Set(W2_VENUES.map((v) => v.id));
    eq(ids.size, W2_VENUES.length, "มี id ซ้ำ");
    if (W2_VENUES.length < 20) throw new Error(`pool เล็กเกิน: ${W2_VENUES.length}`);
  });

  await test("w2-data: มี unseen ที่ count < 3 ไว้ทดสอบ filter (U05)", () => {
    const below = W2_VENUES.filter((v) => v.badge === "unseen" && v.validation_count < 3);
    eq(below.length >= 1, true, "ต้องมีเคส count < 3 อย่างน้อย 1 ตัว");
  });

  // ===== store: countEvents (plan §0/§8.4 — /api/me priceConfirms ใช้ตัวนี้) =====
  // รันผ่าน subprocess ชี้ GN_DATA_FILE ไปไฟล์ temp — กัน dev data จริงใน .data/store.json โดนแตะ
  await test("store-json: countEvents นับถูก + นับเฉพาะ type ที่ขอ (GN_DATA_FILE ชี้ไฟล์ temp)", () => {
    const tmpData = path.join(os.tmpdir(), `gn-countevents-data-${Date.now()}.json`);
    const tmpScript = path.join(os.tmpdir(), `gn-countevents-script-${Date.now()}.mjs`);
    const storeJsonUrl = pathToFileURL(path.join(process.cwd(), "lib", "store-json.ts")).href;
    const scriptSrc = `
import { jsonStore } from ${JSON.stringify(storeJsonUrl)};
const uid = "test-user-countevents";
await jsonStore.addEvent(uid, "price_confirm", {});
await jsonStore.addEvent(uid, "price_confirm", {});
await jsonStore.addEvent(uid, "price_confirm", {});
await jsonStore.addEvent(uid, "other_type", {});
const a = await jsonStore.countEvents(uid, "price_confirm");
const b = await jsonStore.countEvents(uid, "other_type");
const c = await jsonStore.countEvents(uid, "nonexistent_type");
console.log(JSON.stringify({ a, b, c }));
`;
    fs.writeFileSync(tmpScript, scriptSrc);
    try {
      const tsxBin = path.join(process.cwd(), "node_modules", ".bin", "tsx");
      const out = execFileSync(tsxBin, [tmpScript], {
        env: { ...process.env, GN_DATA_FILE: tmpData },
        encoding: "utf8",
      });
      const lastLine = out.trim().split("\n").pop() ?? "{}";
      const { a, b, c } = JSON.parse(lastLine) as { a: number; b: number; c: number };
      eq(a, 3, "price_confirm count");
      eq(b, 1, "other_type count");
      eq(c, 0, "nonexistent_type count");
    } finally {
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      try {
        fs.unlinkSync(tmpData);
      } catch {}
    }
  });

  // ===== store: deletePlan (Task 2.7 — ลบ draft ได้เฉพาะของตัวเอง) =====
  // รันผ่าน subprocess ชี้ GN_DATA_FILE ไปไฟล์ temp เดียวกับ pattern countEvents ด้านบน
  await test("store-json: deletePlan ลบเฉพาะ id ที่ขอ", () => {
    const tmpData = path.join(os.tmpdir(), `gn-deleteplan-data-${Date.now()}.json`);
    const tmpScript = path.join(os.tmpdir(), `gn-deleteplan-script-${Date.now()}.mjs`);
    const storeJsonUrl = pathToFileURL(path.join(process.cwd(), "lib", "store-json.ts")).href;
    const scriptSrc = `
import { jsonStore } from ${JSON.stringify(storeJsonUrl)};
const base = { user_id: "test-user-deleteplan", intent: "work", origin_zone: "siam", status: "draft", route_kind: "cheapest", budget_planned: 500, budget_actual: null, stops: [], created_at: new Date().toISOString() };
await jsonStore.savePlan({ ...base, id: "plan-a" });
await jsonStore.savePlan({ ...base, id: "plan-b" });
await jsonStore.deletePlan("plan-a");
const a = await jsonStore.getPlan("plan-a");
const b = await jsonStore.getPlan("plan-b");
console.log(JSON.stringify({ aGone: a === null, bStays: b !== null }));
`;
    fs.writeFileSync(tmpScript, scriptSrc);
    try {
      const tsxBin = path.join(process.cwd(), "node_modules", ".bin", "tsx");
      const out = execFileSync(tsxBin, [tmpScript], {
        env: { ...process.env, GN_DATA_FILE: tmpData },
        encoding: "utf8",
      });
      const lastLine = out.trim().split("\n").pop() ?? "{}";
      const { aGone, bStays } = JSON.parse(lastLine) as { aGone: boolean; bStays: boolean };
      ok(aGone, "plan-a ต้องถูกลบ");
      ok(bStays, "plan-b ต้องไม่ถูกกระทบ");
    } finally {
      try {
        fs.unlinkSync(tmpScript);
      } catch {}
      try {
        fs.unlinkSync(tmpData);
      } catch {}
    }
  });

  // ===== store: prod guard (launch audit 2026-07-27) =====
  await test("store: production + ไม่มี Supabase env → throw บอกชื่อ env", async () => {
    // next-env.d.ts ประกาศ NODE_ENV เป็น readonly ใน ProcessEnv — ต้อง cast เพื่อ set/delete ใน test
    const env = process.env as Record<string, string | undefined>;
    const prevNodeEnv = env.NODE_ENV;
    const prevUrl = env.SUPABASE_URL;
    const prevKey = env.SUPABASE_SERVICE_KEY;
    try {
      delete env.SUPABASE_URL;
      delete env.SUPABASE_SERVICE_KEY;
      env.NODE_ENV = "production";
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
      if (prevNodeEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = prevNodeEnv;
      if (prevUrl === undefined) delete env.SUPABASE_URL;
      else env.SUPABASE_URL = prevUrl;
      if (prevKey === undefined) delete env.SUPABASE_SERVICE_KEY;
      else env.SUPABASE_SERVICE_KEY = prevKey;
    }
  });

  await test("store: dev ไม่มี Supabase env → ได้ jsonStore ตามเดิม", async () => {
    const { resolveStore } = await import("../lib/store");
    const s = resolveStore(); // NODE_ENV ตอนรัน test ไม่ใช่ production
    ok(typeof s.ensureUser === "function", "ต้องได้ store ที่ใช้งานได้");
  });

  // ===== preflight: env check ก่อน deploy (pure function, ไม่มี network) =====
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
    const h = ollamaHeaders({ OLLAMA_API_KEY: "sk-test" } as unknown as NodeJS.ProcessEnv);
    eq(h.Authorization, "Bearer sk-test");
    eq(h["Content-Type"], "application/json");
  });
  await test("chat: ไม่มี OLLAMA_API_KEY → ไม่มี Authorization (local daemon)", async () => {
    const { ollamaHeaders } = await import("../lib/chat");
    eq("Authorization" in ollamaHeaders({} as NodeJS.ProcessEnv), false);
  });

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

  console.log("════════════════════════════════════════════════════════════");
  console.log(`  ${pass} passed, ${fail} failed (${pass + fail} total)`);
  if (fail > 0) process.exit(1);
}

main();
