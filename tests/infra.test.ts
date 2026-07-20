// infra.test.ts — tests สำหรับชั้น infrastructure (auth cookie, rate limit, catalog)
// รันด้วย: npm run check (ต่อจาก logic.test.ts)
import { decodeUid, encodeUid, verifyLineState } from "../lib/auth";
import { getCatalog } from "../lib/catalog";
import { applyVenueFilters } from "../lib/filters";
import { VENUES } from "../lib/fixtures";
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

  console.log("════════════════════════════════════════════════════════════");
  console.log(`  ${pass} passed, ${fail} failed (${pass + fail} total)`);
  if (fail > 0) process.exit(1);
}

main();
