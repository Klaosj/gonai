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
  { name: "share-bad-404", url: "/p/bad?k=bad", width: 1280, expr: `document.body.innerText.includes("404")` },
  { name: "no-overflow-360-app", url: "/app", width: 360, expr: NO_OVERFLOW },
  { name: "no-overflow-390-app", url: "/app", width: 390, expr: NO_OVERFLOW },
  { name: "no-overflow-768-app", url: "/app", width: 768, expr: NO_OVERFLOW },
  { name: "no-overflow-360-explore", url: "/app/explore", width: 360, expr: NO_OVERFLOW },
];

let pass = 0, fail = 0;
for (const s of STEPS) {
  await setWidth(s.width);
  await nav(s.url);
  const ok = await waitFor(s.expr);
  await shot(`${s.name}-${s.width}`);
  console.log(`  ${ok ? "✓" : "✗"} ${s.name} @${s.width}`);
  ok ? pass++ : fail++;
}
// ยอมรับ error จาก devtools เองเท่านั้น — error จากแอปต้องเป็น 0
consoleErrors = consoleErrors.filter((e) => !String(e).includes("DevTools"));
console.log("═".repeat(50));
console.log(`  ${pass} passed, ${fail} failed · console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5).map((e) => `    · ${e}`).join("\n"));
chrome.kill();
process.exit(fail > 0 || consoleErrors.length > 0 ? 1 : 0);
