// pipeline.test.ts — W2 CSV → lib/fixtures.ts pipeline (ครบวงจร)
// รันด้วย: npm run check (ต่อจาก infra.test.ts)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

// เขียนใน lib/ เพื่อให้ import "./types" ของไฟล์ generated resolve ได้
const TMP = path.join("lib", ".pipeline-tmp-fixtures.ts");

// --- helpers สำหรับ test guard (route consistency + numeric) ---
// วางไฟล์ CSV ชั่วคราวใน os.tmpdir() เสมอ — ไม่มีทางหลุดเข้า git ไม่ว่าจะ crash ระหว่างไหน
function mkTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gonai-pipeline-"));
}

// รัน generator แล้วคืน exit status + stderr (ไม่โยน exception เพื่อให้ test อ่านผลง่าย)
function runGenerator(venuesPath: string, routesPath: string): { status: number; stderr: string } {
  try {
    execFileSync("node_modules/.bin/tsx", ["tests/csv-to-fixtures.ts", venuesPath, routesPath], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return { status: 0, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stderr?: string };
    return { status: err.status ?? 1, stderr: err.stderr ?? "" };
  }
}

// venues CSV แถวเดียวที่ valid ทุกคอลัมน์ — ใช้เป็นฐานสำหรับ test ฝั่ง routes
const VALID_VENUES_CSV = `venue_id,name_th,zone_id,category,intents,badge,hit_rank,unseen_rank,transition_rank,plugs,wifi_mbps,seat_hours,noise,parking,food_level,indoor,shade,price_per_head_min,price_per_head_max,open_time,close_time,walk_min_from_hub,video_url,source,last_validated_at,validation_count
V001,Test Cafe,siam,cafe,work,hit,1,,,all,200,999,medium,false,meals,true,true,150,250,09:00,21:00,6,,sprint,2026-07-12,12
`;

// routes CSV leg เดียวที่ valid ทุกคอลัมน์ — ใช้เป็นฐานสำหรับ test ฝั่ง venues
const VALID_ROUTES_CSV = `route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,Test leg,20,20,10,
`;

async function main() {
  console.log("pipeline.test.ts — W2 CSV → fixtures");

  const out = execFileSync(
    "node_modules/.bin/tsx",
    ["tests/csv-to-fixtures.ts", "tests/fixtures-template.csv", "tests/routes-template.csv"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  fs.writeFileSync(TMP, out);

  try {
    const mod = await import(pathToFileURL(path.resolve(TMP)).href);

    await test("generated fixtures import ได้และ exports ครบ", () => {
      ok(Array.isArray(mod.VENUES), "VENUES missing");
      ok(Array.isArray(mod.ROUTES), "ROUTES missing — บั๊กเดิมกลับมา");
      ok(Array.isArray(mod.ZONES), "ZONES missing");
      ok(!!mod.BUDGET_DEFAULTS && mod.LAUNCH_ZONE === "siam", "constants missing");
    });

    await test("จำนวน venue = จำนวนแถว data ใน CSV", () => {
      const rows = fs.readFileSync("tests/fixtures-template.csv", "utf8").trim().split("\n").length - 1;
      eq(mod.VENUES.length, rows);
    });

    await test("R001 มี 3 legs เรียงตาม seq", () => {
      const r = mod.ROUTES.find((x: { id: string }) => x.id === "R001");
      ok(!!r, "R001 not found");
      eq(r.legs.length, 3);
      eq(r.legs.map((l: { seq: number }) => l.seq).join(","), "1,2,3");
    });

    await test("ทุกเส้นทางจบที่ siam + kind ถูก + leg ผูก route_id ถูก", () => {
      ok(mod.ROUTES.length >= 4, "ต้องมีอย่างน้อย 4 เส้น (2 origins × 2 kinds)");
      for (const r of mod.ROUTES) {
        eq(r.dest_zone, "siam", r.id);
        ok(r.kind === "cheapest" || r.kind === "fastest", `${r.id} kind=${r.kind}`);
        for (const l of r.legs) eq(l.route_id, r.id, `${r.id} leg route_id`);
      }
    });

    await test("warning_th ว่างใน CSV → null (ไม่ใช่ empty string)", () => {
      const r = mod.ROUTES.find((x: { id: string }) => x.id === "R001");
      eq(r.legs[0].warning_th, null);
      eq(r.legs[1].warning_th, "Last boat 19:40");
    });

    await test("venue sanity: price min ≤ max ทุกที่", () => {
      for (const v of mod.VENUES) {
        ok(v.price_per_head_min <= v.price_per_head_max, v.id);
      }
    });

    await test("ไม่ส่ง routes.csv → exit non-zero (กัน fixtures ที่ compile ไม่ผ่าน)", () => {
      let code = 0;
      try {
        execFileSync(
          "node_modules/.bin/tsx",
          ["tests/csv-to-fixtures.ts", "tests/fixtures-template.csv"],
          { encoding: "utf8", stdio: "pipe" },
        );
      } catch (e) {
        code = (e as { status?: number }).status ?? 1;
      }
      ok(code !== 0, "should exit non-zero without routes csv");
    });

    await test("nullable numeric ว่างใน CSV จริง → null, มีค่า (999=ไม่จำกัด) → เลขจริง", () => {
      const u001 = mod.VENUES.find((v: { id: string }) => v.id === "U001");
      ok(!!u001, "U001 not found");
      eq(u001.hit_rank, null, "U001 hit_rank ควรว่าง→null");
      eq(u001.unseen_rank, 1, "U001 unseen_rank มีค่าจริง");
      eq(u001.transition_rank, null, "U001 transition_rank ควรว่าง→null");
      eq(u001.attributes.seat_hours, 999, "seat_hours=999 คือไม่จำกัด ไม่ใช่ค่าต้องห้าม");
    });
  } finally {
    fs.rmSync(TMP, { force: true });
  }

  // --- guard ใหม่: route consistency + numeric (RED ก่อนแก้ generator) ---

  await test("route: leg ของ route เดียวกัน origin_zone ไม่ตรงกัน → exit non-zero + บอก route_id", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(venuesPath, VALID_VENUES_CSV);
      fs.writeFileSync(
        routesPath,
        `route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,leg one,20,20,10,
R001,ladprao,siam,cheapest,2,walk,leg two,0,0,5,
`,
      );
      const { status, stderr } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ origin_zone ชนกันใน route เดียวกัน");
      ok(stderr.includes("R001"), `stderr ควรมี route_id R001: ${stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("route: seq ซ้ำใน route เดียวกัน → exit non-zero + บอก route_id + seq", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(venuesPath, VALID_VENUES_CSV);
      fs.writeFileSync(
        routesPath,
        `route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,leg one,20,20,10,
R001,bangkapi,siam,cheapest,1,walk,leg two,0,0,5,
`,
      );
      const { status, stderr } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ seq ซ้ำใน route เดียวกัน");
      ok(stderr.includes("R001"), `stderr ควรมี route_id R001: ${stderr}`);
      ok(stderr.includes("1"), `stderr ควรมี seq ที่ซ้ำ: ${stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("routes: mandatory numeric ว่าง (price_min) → exit non-zero", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(venuesPath, VALID_VENUES_CSV);
      fs.writeFileSync(
        routesPath,
        `route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,leg one,,20,10,
`,
      );
      const { status } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ price_min ว่าง (ห้ามกลาย seq: 0 เงียบๆ)");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("routes: mandatory numeric เพี้ยน (minutes=abc) → exit non-zero", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(venuesPath, VALID_VENUES_CSV);
      fs.writeFileSync(
        routesPath,
        `route_id,origin_zone,dest_zone,kind,seq,mode,detail_th,price_min,price_max,minutes,warning_th
R001,bangkapi,siam,cheapest,1,win,leg one,20,20,abc,
`,
      );
      const { status } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ minutes parse ไม่ได้ (ห้ามกลาย NaN เงียบๆ)");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("venues: mandatory numeric ว่าง (price_per_head_min) → exit non-zero", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(
        venuesPath,
        `venue_id,name_th,zone_id,category,intents,badge,hit_rank,unseen_rank,transition_rank,plugs,wifi_mbps,seat_hours,noise,parking,food_level,indoor,shade,price_per_head_min,price_per_head_max,open_time,close_time,walk_min_from_hub,video_url,source,last_validated_at,validation_count
V001,Test Cafe,siam,cafe,work,hit,1,,,all,200,999,medium,false,meals,true,true,,250,09:00,21:00,6,,sprint,2026-07-12,12
`,
      );
      fs.writeFileSync(routesPath, VALID_ROUTES_CSV);
      const { status } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ price_per_head_min ว่าง");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("venues: nullable numeric เพี้ยน (hit_rank=abc) → exit non-zero", () => {
    const dir = mkTmpDir();
    try {
      const venuesPath = path.join(dir, "venues.csv");
      const routesPath = path.join(dir, "routes.csv");
      fs.writeFileSync(
        venuesPath,
        `venue_id,name_th,zone_id,category,intents,badge,hit_rank,unseen_rank,transition_rank,plugs,wifi_mbps,seat_hours,noise,parking,food_level,indoor,shade,price_per_head_min,price_per_head_max,open_time,close_time,walk_min_from_hub,video_url,source,last_validated_at,validation_count
V001,Test Cafe,siam,cafe,work,hit,abc,,,all,200,999,medium,false,meals,true,true,150,250,09:00,21:00,6,,sprint,2026-07-12,12
`,
      );
      fs.writeFileSync(routesPath, VALID_ROUTES_CSV);
      const { status } = runGenerator(venuesPath, routesPath);
      ok(status !== 0, "ควร exit non-zero เมื่อ hit_rank มีค่าแต่ parse ไม่ได้ (nullable ≠ ยอมทุกอย่าง)");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  console.log("═".repeat(60));
  console.log(`  ${pass} passed, ${fail} failed (${pass + fail} total)`);
  if (fail > 0) process.exit(1);
}

main();
