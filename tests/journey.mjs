// journey.mjs — smoke ทุกหน้าผ่าน headless Chrome (raw CDP, ไม่มี dependency)
// รัน: npm run dev (รอ ready) แล้ว npm run journey
// ต้องการ Node >= 22 (global WebSocket) · Chrome ที่ /Applications หรือ env GN_CHROME_BIN
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.GN_BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.GN_CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9223;
const SHOT_DIR = path.join("design", "qa", process.env.GN_QA_RUN ?? "journey-latest");

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${fs.mkdtempSync("/tmp/gn-chrome-")}`,
  "--no-first-run", "about:blank",
], { stdio: "ignore" });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTab() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/new?url=about:blank`, { method: "PUT" });
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* chrome ยังไม่พร้อม */ }
    await wait(250);
  }
  throw new Error("Chrome DevTools ไม่ตอบ");
}

let msgId = 0;
const pending = new Map();
let consoleErrors = [];
const ws = new WebSocket(await newTab());
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails?.text ?? "exception");
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    consoleErrors.push(m.params.args?.[0]?.value ?? "console.error");
  }
};
await new Promise((r) => (ws.onopen = r));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");

async function nav(url) {
  await send("Page.navigate", { url: BASE + url });
  await wait(1600); // hydration + fetch แรก
}
async function setWidth(w) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 640 });
  await wait(300);
}
async function evalJS(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result.value;
}
// เหมือน evalJS แต่รอ Promise resolve จริง (awaitPromise) — ใช้กับ fetch ใน page context (Task 0.2 bootstrap)
async function evalAsyncJS(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text ?? "evalAsyncJS threw");
  return r.result.value;
}
async function waitFor(expr, timeoutMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJS(expr)) return true;
    await wait(400);
  }
  return false;
}
async function shot(name) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, "base64"));
}

const NO_OVERFLOW = "document.documentElement.scrollWidth <= window.innerWidth + 1";
// STEPS: worker รันจริงแล้วปรับ expression ให้ตรง DOM ปัจจุบัน — ห้ามตัด step
// หมายเหตุ landing-loads: /app ตอน localStorage ยังไม่มี gn_onboarded จะ client-redirect ไป /app/welcome
// จริง (onboarding flow จริงของแอป — app/app/planner-client.tsx:384-392) เลยแถม side-effect
// set gn_onboarded='1' (ค่าเดียวกับที่ app/app/welcome/page.tsx set ตอนผู้ใช้จริงทำ onboarding เสร็จ)
// เพื่อให้ step ถัดๆ ไปที่ยิง /app เจอ planner จริง ไม่ใช่จอ onboarding — assert เดิม (a[href="/app"]) ไม่เปลี่ยน
const STEPS = [
  {
    name: "landing-loads",
    url: "/",
    width: 1280,
    expr: `(() => { try { localStorage.setItem("gn_onboarded", "1"); } catch {} return !!document.querySelector('a[href="/app"]'); })()`,
  },
  { name: "landing-waitlist", url: "/", width: 1280, expr: `!!document.querySelector("form input")` },
  { name: "app-budget-target", url: "/app", width: 1280, expr: `!!document.getElementById("gn-budget-target")` },
  { name: "app-chat-input", url: "/app", width: 1280, expr: `!!document.querySelector("input[placeholder]")` },
  { name: "explore-tabs", url: "/app/explore", width: 1280, expr: `document.querySelectorAll("button").length >= 5` },
  { name: "me-past-trips", url: "/app/me", width: 1280, expr: `document.body.innerText.includes("Past trips")` },
  { name: "group-loads", url: "/app/group", width: 1280, expr: `!!document.querySelector("h1")` },
  { name: "welcome-loads", url: "/app/welcome", width: 1280, expr: `!!document.querySelector("h1")` },
  // notFound() ใน app/p/[id]/page.tsx bubble ขึ้นไปที่ app/not-found.tsx (root) เหมือน unmatched route
  // ทุกตัว เพราะไม่มี not-found.tsx ที่ specific กว่านี้ในทรี — เช็คเนื้อ branded จริง ไม่ใช่แค่เลข "404"
  { name: "share-bad-404", url: "/p/bad?k=bad", width: 1280, expr: `document.body.innerText.includes("Back to planner")` },
  // T2.5 — unmatched route ใต้ /app ต้องได้ 404 ในแบรนด์เหมือนกัน (คนละทางเข้ากับ share-bad-404 ที่มาจาก
  // notFound() ใน page component — เผื่อวันหลังมีคนเพิ่ม not-found.tsx เฉพาะทางใดทางหนึ่งแล้วอีกทางหลุด)
  { name: "app-404", url: "/app/nonexistent", width: 1280, expr: `document.body.innerText.includes("Back to planner")` },
  { name: "no-overflow-360-app", url: "/app", width: 360, expr: NO_OVERFLOW },
  { name: "no-overflow-390-app", url: "/app", width: 390, expr: NO_OVERFLOW },
  { name: "no-overflow-768-app", url: "/app", width: 768, expr: NO_OVERFLOW },
  { name: "no-overflow-360-explore", url: "/app/explore", width: 360, expr: NO_OVERFLOW },
  // T2.2 — bottom tab bar มือถือ ต้องมีจริง (ปิด P0 nav) และมีลิงก์ไปครบ 4 แท็บ (เช็ค explore เป็นตัวแทน)
  {
    name: "mobile-tabbar",
    url: "/app",
    width: 390,
    expr: `!!document.querySelector('nav[aria-label="Main"] a[href="/app/explore"]')`,
  },
  // T2.8 (การตัดสินใจ Klao ข้อ 2) — มือถือต้องเห็นการ์ดร้าน (col2) ก่อนแชท/เงื่อนไข (col1) ในลำดับที่ตาเห็นจริง
  // เทียบ top ของการ์ดใบแรก ([data-vcard]) กับปุ่มยุบ/ขยายแชท ([data-chat-toggle]) — การ์ดต้องอยู่สูงกว่า (top น้อยกว่า)
  {
    name: "mobile-cards-before-chat",
    url: "/app",
    width: 390,
    expr: `(() => {
      const card = document.querySelector("[data-vcard]");
      const chat = document.querySelector("[data-chat-toggle]");
      if (!card || !chat) return false;
      return card.getBoundingClientRect().top < chat.getBoundingClientRect().top;
    })()`,
  },
];

let pass = 0, fail = 0;
// เดิมเป็น for-loop inline ล้วนๆ — แตกเป็นฟังก์ชัน runStep เพื่อใช้ซ้ำกับ step ใหม่ 4 ตัวของ
// /app/plan/[id] (Task 0.2) โดยไม่แตะ logic เดิมสักบรรทัด (setWidth/nav/waitFor/shot/pass-fail เหมือนเดิมทุกอย่าง)
async function runStep(s) {
  await setWidth(s.width);
  await nav(s.url);
  const ok = await waitFor(s.expr);
  await shot(`${s.name}-${s.width}`);
  console.log(`  ${ok ? "✓" : "✗"} ${s.name} @${s.width}`);
  ok ? pass++ : fail++;
}
for (const s of STEPS) await runStep(s);

// ===== Task 0.2 — ปิด blind spot: journey ไม่เคย render /app/plan/[id] เลย =====
// หน้านี้คือหน้าหลักของแอป (โหมด draft/active/done) เพิ่งแตกเป็น 4 ไฟล์ใน T1.5 และมีงานอีกหลาย
// task (T2.6 DoneView CTA, T4.2 warn banner) กำลังจะลงตรงนี้ต่อ — ถ้า journey ไม่แตะ หน้านี้พังแล้ว
// gate ยังเขียวได้ จึงต้องสร้าง plan จริงผ่าน API ของแอปเอง (ห้าม hardcode id ที่อาจไม่มีอยู่จริง)
// แล้วครอบให้ครบทั้ง 3 โหมด

// สร้าง plan จริงผ่าน fetch ใน page context (คุกกี้ auth ของ browser ติดไปด้วยเหมือนผู้ใช้จริง)
// shape ตรงกับ addToPlan จริงใน app/app/planner-client.tsx:427-441 (intent/origin/venue_id/budget)
// venue_id เอาจาก GET /api/venues ตัวแรก (cards[0].id) ไม่ hardcode · budget 450 = BUDGET_DEFAULTS.work
// ใน lib/fixtures.ts (ค่า default จริงตอนผู้ใช้ยังไม่ปรับ ตรงกับ intent/origin ที่ใช้สร้าง plan นี้)
async function createTestPlan() {
  return evalAsyncJS(`(async () => {
    try {
      const vr = await fetch("/api/venues?intent=work&origin=bangkapi", { credentials: "same-origin" });
      if (!vr.ok) return { ok: false, error: "GET /api/venues " + vr.status };
      const vd = await vr.json();
      const venueId = vd && vd.cards && vd.cards[0] && vd.cards[0].id;
      if (!venueId) return { ok: false, error: "GET /api/venues ไม่มี card ให้หยิบ venue_id" };
      const pr = await fetch("/api/plans", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "work", origin: "bangkapi", venue_id: venueId, budget: 450 }),
      });
      if (!pr.ok) return { ok: false, error: "POST /api/plans " + pr.status };
      const pd = await pr.json();
      if (!pd || !pd.id) return { ok: false, error: "POST /api/plans ไม่คืน id" };
      return { ok: true, id: pd.id };
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  })()`);
}

// PATCH plan ผ่าน API จริงเหมือนกด "Start the trip ▶" / "End trip ✓" — ไม่ throw เอง คืน {ok,status} เสมอ
async function patchTestPlan(id, action) {
  const url = `/api/plans/${id}`;
  return evalAsyncJS(`(async () => {
    try {
      const r = await fetch(${JSON.stringify(url)}, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: ${JSON.stringify(action)} }),
      });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  })()`);
}

const createdPlan = await createTestPlan();
if (!createdPlan || !createdPlan.ok) {
  // ข้อบังคับของ task: ห้าม skip เงียบ — สร้าง plan ไม่สำเร็จต้องนับเป็น fail ให้ exit non-zero
  console.log(`  ✗ plan-bootstrap — สร้าง plan ไม่สำเร็จ: ${createdPlan?.error ?? "ไม่ทราบสาเหตุ"}`);
  fail++;
} else {
  const planId = createdPlan.id;
  const planUrl = `/app/plan/${planId}`;

  await runStep({
    name: "plan-draft-view",
    url: planUrl,
    width: 1280,
    expr: `Array.from(document.querySelectorAll("button")).some((b) => b.textContent.includes("Start the trip"))`,
  });

  await patchTestPlan(planId, "start"); // draft → active (เหมือนกด "Start the trip ▶" จริง)
  await runStep({
    name: "plan-trip-view",
    url: planUrl,
    width: 390,
    expr: `Array.from(document.querySelectorAll("button")).some((b) => b.textContent.includes("Check in"))`,
  });

  await runStep({ name: "no-overflow-390-plan", url: planUrl, width: 390, expr: NO_OVERFLOW });

  await patchTestPlan(planId, "done"); // active → done (เหมือนกด "End trip ✓" จริง)
  await runStep({
    name: "plan-done-view",
    url: planUrl,
    width: 1280,
    // .o-mono มี text-transform: uppercase (app/globals.css) → innerText คืนตัวพิมพ์ใหญ่ ต้อง lowercase ก่อนเทียบ
    expr: `document.body.innerText.toLowerCase().includes("actually spent today")`,
  });

  // สำคัญมาก: ปิดท้ายด้วยการบังคับ PATCH ให้ plan นี้เป็น done เสมอ ไม่ว่า step ข้างบนจะพังกลางทางหรือไม่
  // (เช่น assert "Check in" fail แต่ PATCH start ไปแล้วจริง) — เหตุผล: Task 2.3 (ถัดไปในแผน) จะทำ server
  // ปฏิเสธการ start ทริปที่สองด้วย 409 เมื่อผู้ใช้มี plan active ค้างอยู่ ถ้า journey รอบนี้ทิ้ง plan ไว้
  // เป็น active ค้าง รอบถัดไป (npm run journey อีกครั้ง) จะ start ทริปใหม่ไม่ได้ ทำให้ step แดงผิดๆ
  // ทั้งที่แอปไม่ได้พัง — ต้อง idempotent ทุกรอบ
  await patchTestPlan(planId, "done").catch(() => {});
}

// ยอมรับ error จาก devtools เองเท่านั้น — error จากแอปต้องเป็น 0
consoleErrors = consoleErrors.filter((e) => !String(e).includes("DevTools"));
console.log("═".repeat(50));
console.log(`  ${pass} passed, ${fail} failed · console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5).map((e) => `    · ${e}`).join("\n"));
chrome.kill();
process.exit(fail > 0 || consoleErrors.length > 0 ? 1 : 0);
