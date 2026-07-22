// logic.test.ts — integration tests สำหรับ pure functions ใน lib/
// รันด้วย: npm run check (tsx tests/logic.test.ts)
// ครอบคลุม QA R1-R10 edge cases + contracts ใน MVP Build Spec v1.0

import { assert } from "node:console";
import { chainSuggestions } from "../lib/chaining";
import { parseQuick } from "../lib/chat";
import { bahtChipText, ceil10, dayBudgetEst, fmtRange, grabEstimate, mid, round5, routeCost } from "../lib/costing";
import { budgetDefault } from "../lib/budget";
import { BUDGET_DEFAULTS, ROUTES, VENUES } from "../lib/fixtures";
import { top3 } from "../lib/top3";
import type { Intent, Plan, Venue } from "../lib/types";

let pass = 0;
let fail = 0;
const results: { name: string; ok: boolean; detail?: unknown }[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    results.push({ name, ok: true });
  } catch (e) {
    fail++;
    results.push({ name, ok: false, detail: e instanceof Error ? e.message : e });
  }
}

const eq = <T>(actual: T, expected: T, msg?: string) => {
  if (actual !== expected) {
    throw new Error(`${msg ?? "eq"}: expected ${expected}, got ${actual}`);
  }
};
const deepEq = <T>(actual: T, expected: T, msg?: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg ?? "deepEq"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};
const truthy = (v: unknown, msg?: string) => {
  if (!v) throw new Error(msg ?? "expected truthy");
};
const falsy = (v: unknown, msg?: string) => {
  if (v) throw new Error(msg ?? "expected falsy");
};

// ─── costing.ts ────────────────────────────────────────────

test("mid: (100+200)/2 = 150", () => eq(mid(100, 200), 150));
test("mid: odd sum rounds 147 → 150", () => eq(mid(100, 199), 150)); // (299)/2=149.5 → 150
test("ceil10: 271.7 → 280", () => eq(ceil10(271.7), 280));
test("ceil10: 200 → 200", () => eq(ceil10(200), 200));
test("round5: 137 → 135", () => eq(round5(137), 135));
test("fmtRange: equal → '200฿'", () => eq(fmtRange(200, 200), "200฿"));
test("fmtRange: range → '180–210฿'", () => eq(fmtRange(180, 210), "180–210฿"));

test("routeCost: R001 cheapest = 47฿ min", () => {
  const rc = routeCost(ROUTES[0].legs); // วิน20 + เรือ27 + เดิน0 = 47
  eq(rc.min, 47, "R001 min");
  eq(rc.max, 47, "R001 max");
  eq(rc.minutes, 48, "R001 minutes");
});

test("bahtChipText: single paid leg → 'Grab 180–210฿'", () => {
  const r002 = ROUTES.find((r) => r.id === "R002")!;
  const txt = bahtChipText(r002.legs);
  eq(txt, "Grab 180–210฿");
});

test("bahtChipText: multi paid legs → 'Win bike 20฿ + Boat 27฿ = 47฿'", () => {
  const r001 = ROUTES.find((r) => r.id === "R001")!;
  const txt = bahtChipText(r001.legs);
  eq(txt, "Win bike 20฿ + Boat 27฿ = 47฿");
});

test("dayBudgetEst: (200+47)*1.10 ceil10 = 280", () => {
  eq(dayBudgetEst([200], [47]), 280);
});
test("dayBudgetEst: (200+195)*1.10 ceil10 = 440", () => {
  eq(dayBudgetEst([200], [195]), 440);
});

test("grabEstimate: 12km → within plausible range", () => {
  const e = grabEstimate(12);
  truthy(e.min > 100 && e.max < 300, `12km grab out of range: ${e.min}-${e.max}`);
  truthy(e.min < e.max, "min should be < max");
});

// ─── budget.ts ─────────────────────────────────────────────

test("budgetDefault: no history → table default (work=450)", () => {
  eq(budgetDefault("work", []), 450);
  eq(budgetDefault("date", []), 900);
  eq(budgetDefault("family", []), 1200);
  eq(budgetDefault("photo", []), 600);
});

test("budgetDefault: <3 done plans → still table default", () => {
  const plans: Plan[] = [
    { id: "p1", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: 300, stops: [], created_at: "" },
    { id: "p2", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: 400, stops: [], created_at: "" },
  ];
  eq(budgetDefault("work", plans), 450, "only 2 plans, should use table");
});

test("budgetDefault: ≥3 done plans → median rounded to 50", () => {
  const mkPlan = (actual: number): Plan => ({
    id: `p${actual}`, user_id: "u", intent: "work", origin_zone: "bangkapi",
    status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: actual,
    stops: [], created_at: "",
  });
  // odd count: median = middle value
  eq(budgetDefault("work", [mkPlan(300), mkPlan(400), mkPlan(500)]), 400);
  // even count: median = avg of two middle, rounded to 50
  // [300,400,500,600] → (400+500)/2 = 450 → round50 = 450
  eq(budgetDefault("work", [mkPlan(300), mkPlan(400), mkPlan(500), mkPlan(600)]), 450);
  // rounded to nearest 50: [300,400,450] median=400 → round50=400
  eq(budgetDefault("work", [mkPlan(300), mkPlan(400), mkPlan(450)]), 400);
  // [300,400,425] median=400 → round50=400
  eq(budgetDefault("work", [mkPlan(300), mkPlan(400), mkPlan(425)]), 400);
  // [300,400,475] median=400 → round50=400
  eq(budgetDefault("work", [mkPlan(300), mkPlan(400), mkPlan(475)]), 400);
});

test("budgetDefault: filters out null budget_actual", () => {
  const plans: Plan[] = [
    { id: "p1", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: null, stops: [], created_at: "" },
    { id: "p2", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: 300, stops: [], created_at: "" },
    { id: "p3", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: 500, stops: [], created_at: "" },
    { id: "p4", user_id: "u", intent: "work", origin_zone: "bangkapi", status: "done", route_kind: "cheapest", budget_planned: 500, budget_actual: 400, stops: [], created_at: "" },
  ];
  // 3 non-null actuals: [300,400,500] median=400
  eq(budgetDefault("work", plans), 400);
});

// ─── top3.ts ───────────────────────────────────────────────

test("top3 (work): 2 Hit + 1 Unseen = 3 cards", () => {
  const r = top3(VENUES, "work");
  eq(r.cards.length, 3);
  // first two are hit
  eq(r.cards[0].badge, "hit");
  eq(r.cards[1].badge, "hit");
  // third is unseen
  eq(r.cards[2].badge, "unseen");
});

test("top3 (work): Hit sorted by hit_rank ASC", () => {
  const r = top3(VENUES, "work");
  truthy((r.cards[0].hit_rank ?? 0) <= (r.cards[1].hit_rank ?? 99), "hit_rank ASC");
});

test("top3: unseen validation_count < 3 ไม่โผล่ (R4)", () => {
  // U002 has validation_count=2 — should never appear in cards or more
  const r = top3(VENUES, "work");
  const all = [...r.cards, ...r.more];
  falsy(all.some((v) => v.id === "U002"), "U002 (count=2) should be hidden");
});

test("top3 (family): unseen pool empty → fallback to 3rd hit OR fewer cards", () => {
  const r = top3(VENUES, "family");
  // family has 1 hit (V012), 0 unseen → unseenPoolEmpty=true, cards.length=1
  truthy(r.unseenPoolEmpty, "family should have empty unseen pool");
  // fallback only kicks in if there's a 3rd hit; here only 1 hit so cards=1
  eq(r.cards.length, 1);
});

test("top3 (photo): 1 unseen (U003 count=4) passes filter", () => {
  const r = top3(VENUES, "photo");
  // photo has 0 hit, 1 unseen (U003) → cards = [U003]
  eq(r.cards.length, 1);
  eq(r.cards[0].id, "U003");
  falsy(r.unseenPoolEmpty, "photo unseen pool should not be empty (U003 exists)");
});

test("top3: 'more' สลับ hit/unseen สูงสุด 4", () => {
  const r = top3(VENUES, "work");
  truthy(r.more.length <= 4, "more should be ≤ 4");
});

// ─── chaining.ts ────────────────────────────────────────────

const chainBase = { zoneId: "siam", remainingBudget: 500 };

test("chaining: เวลา 14:00 → เปิดอยู่ (R6)", () => {
  const list = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00" });
  truthy(list.length > 0, "should have open venues at 14:00");
});

test("chaining: เวลา 00:30 → ทุกที่ปิด (R6)", () => {
  const list = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "00:30" });
  eq(list.length, 0);
});

test("chaining: indoor=1 กรอง outdoor ออก (R7)", () => {
  const all = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "17:00" });
  const indoor = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "17:00", indoorOnly: true });
  // ทุกผล indoor ต้องเป็น true
  truthy(indoor.every((v) => v.attributes.indoor), "all indoor=true");
  // จำนวน indoor ≤ จำนวน all
  truthy(indoor.length <= all.length, "indoor count ≤ all count");
  // V012 (market, indoor=false) ต้องไม่อยู่ใน indoor list
  falsy(indoor.some((v) => v.id === "V012"), "V012 should be filtered out with indoor=1");
  // V012 ต้องอยู่ใน all list (ถ้าเปิดอยู่)
  const v012InAll = all.some((v) => v.id === "V012");
  truthy(v012InAll, "V012 should appear without indoor filter");
});

test("chaining: remainingBudget กรองที่เกินงบ", () => {
  const cheap = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00", remainingBudget: 50 });
  // ทุกผลต้อง mid(price) ≤ 50
  truthy(cheap.every((v) => mid(v.price_per_head_min, v.price_per_head_max) <= 50), "all ≤ 50฿");
});

test("chaining: excludeIds ตัด venue ที่ส่งมา", () => {
  const r = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00" });
  if (r.length === 0) return; // skip if time-gated
  const excludeId = r[0].id;
  const r2 = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00", excludeIds: [excludeId] });
  falsy(r2.some((v) => v.id === excludeId), "excluded venue should not appear");
});

test("chaining: เรียงตาม transition_rank ASC, null ไปท้าย", () => {
  const list = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00" });
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1].transition_rank ?? Infinity;
    const b = list[i].transition_rank ?? Infinity;
    truthy(a <= b, `transition_rank not ASC at ${i}: ${a} > ${b}`);
  }
});

test("chaining: สูงสุด 3 ผล", () => {
  const list = chainSuggestions(VENUES, { ...chainBase, timeHHMM: "14:00" });
  truthy(list.length <= 3, "should be ≤ 3");
});

// ─── fixtures sanity ───────────────────────────────────────

test("fixtures: BUDGET_DEFAULTS ครบ 4 intents", () => {
  const intents: Intent[] = ["work", "date", "family", "photo"];
  for (const i of intents) {
    truthy(BUDGET_DEFAULTS[i] > 0, `budget default for ${i}`);
  }
});

test("fixtures: ทุก unseen venue ที่ count≥3 ผ่าน filter", () => {
  const unseen = VENUES.filter((v) => v.badge === "unseen");
  for (const v of unseen) {
    if (v.validation_count >= 3) {
      // should be eligible for top3
      const r = top3([v], v.intents[0]);
      truthy(r.cards.some((c) => c.id === v.id), `${v.id} should appear in its intent pool`);
    }
  }
});

// ─── chat.ts — quick parser (fallback ของ /api/chat) ───────

test("chat: ไทยครบชุด เดท+ลาดพร้าว+งบ+เงียบ", () => {
  const r = parseQuick("เสาร์นี้ไปเดทจากลาดพร้าว งบ 500 บาท ขอที่เงียบๆ");
  eq(r.actions.intent, "date");
  eq(r.actions.origin, "ladprao");
  eq(r.actions.budget, 500);
  eq(r.actions.filters?.quiet, true);
});
test("chat: อังกฤษ work + plugs + zone", () => {
  const r = parseQuick("work session from On Nut, need plugs");
  eq(r.actions.intent, "work");
  eq(r.actions.origin, "onnut");
  eq(r.actions.filters?.plugs, true);
});
test("chat: ฝนตก → indoor", () => {
  const r = parseQuick("ฝนตก หาที่ในร่มให้หน่อย");
  eq(r.actions.filters?.indoor, true);
});
test("chat: งบเลขโดด 450 ถูกจับ / เลขนอกช่วงไม่จับ", () => {
  eq(parseQuick("มีเงิน 450 พอไหม").actions.budget, 450);
  eq(parseQuick("ปี 2026 ไปไหนดี").actions.budget, undefined);
});
test("chat: ข้อความไม่เข้าเค้า → actions ว่าง", () => {
  deepEq(parseQuick("สวัสดีครับ").actions, {});
});
test("chat: 500฿ แบบมีสัญลักษณ์", () => {
  eq(parseQuick("budget 500฿ family day at Chatuchak").actions.budget, 500);
  eq(parseQuick("budget 500฿ family day at Chatuchak").actions.intent, "family");
  eq(parseQuick("budget 500฿ family day at Chatuchak").actions.origin, "chatuchak");
});

// ─── timeline.ts + share.ts (chat-to-plan v2) ──────────────

import { buildTimeline, tripTitle } from "../lib/timeline";
import { sharePath, shareToken, verifyShareToken } from "../lib/share";
import type { Route } from "../lib/types";

const legs25 = { legs: [{ minutes: 10 }, { minutes: 15 }] } as unknown as Pick<Route, "legs">;
const cafe = { venue: { category: "cafe" as const, open_time: "09:00", walk_min_from_hub: 5 } };
const market = { venue: { category: "market" as const, open_time: "10:00", walk_min_from_hub: 7 } };

test("timeline: transit = legs จริง + เดินถึงร้านแรก, เวลาต่อเนื่องถูก", () => {
  const tl = buildTimeline([cafe, market], legs25)!;
  eq(tl.transitMin, 30); // 25 legs + 5 walk
  eq(tl.leaveOrigin, "09:30");
  eq(tl.stops[0].start, "10:00");
  eq(tl.stops[0].end, "11:30"); // cafe stay 90
  eq(tl.stops[1].walkFromPrev, 12); // 5+7 ผ่าน hub
  eq(tl.stops[1].start, "11:42");
});
test("timeline: ร้านเปิดสาย = รอถึงเวลาเปิด", () => {
  const late = { venue: { category: "cafe" as const, open_time: "11:00", walk_min_from_hub: 3 } };
  const tl = buildTimeline([late], legs25)!;
  eq(tl.stops[0].start, "11:00");
  eq(tl.leaveOrigin, "10:32"); // 11:00 - (25+3)
});
test("timeline: ไม่มี stop = null", () => eq(buildTimeline([], legs25), null));
test("tripTitle: ประกอบจากข้อมูลจริง", () =>
  eq(tripTitle("date", "Lat Phrao", 500), "💛 Date day from Lat Phrao · 500฿"));

test("share: token ตรง verify ผ่าน / ปลอมไม่ผ่าน / path ถูกรูป", () => {
  const t = shareToken("plan-x");
  truthy(verifyShareToken("plan-x", t));
  falsy(verifyShareToken("plan-x", "forged-token-000000"));
  falsy(verifyShareToken("plan-y", t));
  truthy(sharePath("plan-x").startsWith("/p/plan-x?k="));
});

// ─── print results ─────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log("GoNai logic tests");
console.log("═".repeat(60));
for (const r of results) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : ` — ${r.detail}`}`);
}
console.log("═".repeat(60));
console.log(`  ${pass} passed, ${fail} failed (${results.length} total)`);
console.log("");

if (fail > 0) process.exit(1);