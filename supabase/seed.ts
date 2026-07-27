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
