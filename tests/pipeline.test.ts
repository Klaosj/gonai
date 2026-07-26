// pipeline.test.ts — W2 CSV → lib/fixtures.ts pipeline (ครบวงจร)
// รันด้วย: npm run check (ต่อจาก infra.test.ts)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
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
  } finally {
    fs.rmSync(TMP, { force: true });
  }

  console.log("═".repeat(60));
  console.log(`  ${pass} passed, ${fail} failed (${pass + fail} total)`);
  if (fail > 0) process.exit(1);
}

main();
