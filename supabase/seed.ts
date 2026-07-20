// Seed catalog (zones/venues/routes) ลง Supabase
//
//   npx tsx supabase/seed.ts        → ใช้ข้อมูลจาก lib/fixtures.ts (9 venues placeholder)
//   npx tsx supabase/seed.ts --w2   → ใช้ W2 mock (40 venues + 16 routes) สำหรับ staging
//
// ต้องมี SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env (script โหลด .env ให้เอง)
// รัน supabase/schema.sql ใน SQL Editor ก่อนครั้งแรก
import fs from "fs";
import path from "path";

// tsx ไม่โหลด .env ให้ — parse เองแบบง่าย (KEY=VALUE ต่อบรรทัด)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function main() {
  const { isSupabaseEnabled, upsertCatalog } = await import("./store-adapter");
  if (!isSupabaseEnabled()) {
    console.error("ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env ก่อน");
    process.exit(1);
  }

  const useW2 = process.argv.includes("--w2");
  let catalog;
  if (useW2) {
    const { W2_ROUTES, W2_VENUES, W2_ZONES } = await import("../tests/w2-data");
    catalog = { zones: W2_ZONES, venues: W2_VENUES, routes: W2_ROUTES };
  } else {
    const { ROUTES, VENUES, ZONES } = await import("../lib/fixtures");
    catalog = { zones: ZONES, venues: VENUES, routes: ROUTES };
  }

  await upsertCatalog(catalog);
  console.log(
    `seed สำเร็จ (${useW2 ? "W2 mock" : "fixtures"}): ${catalog.zones.length} zones, ${catalog.venues.length} venues, ${catalog.routes.length} routes`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
