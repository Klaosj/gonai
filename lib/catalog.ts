// Catalog = content ของแอป (zones/venues/routes)
//   dev  : lib/fixtures.ts
//   prod : ตาราง Supabase (แก้ข้อมูลร้าน/เส้นทางได้โดยไม่ต้อง deploy โค้ด)
// cache ใน memory 5 นาที — ทีม field ops แก้ใน dashboard แล้วรอไม่เกิน 5 นาทีเห็นผล
import { ROUTES, VENUES, ZONES } from "./fixtures";
import { fetchCatalog, isSupabaseEnabled } from "../supabase/store-adapter";
import type { Route, Venue, Zone } from "./types";

export interface Catalog {
  zones: Zone[];
  venues: Venue[];
  routes: Route[];
}

const TTL_MS = 5 * 60_000;
let cache: { data: Catalog; at: number } | null = null;
let warnedEmpty = false;

export async function getCatalog(): Promise<Catalog> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (isSupabaseEnabled()) {
    const db = await fetchCatalog();
    if (db) {
      cache = { data: db, at: Date.now() };
      return db;
    }
    if (!warnedEmpty) {
      warnedEmpty = true;
      console.warn("[gonai] Supabase เปิดอยู่แต่ตาราง venues ว่าง — ใช้ fixtures ชั่วคราว (seed: npx tsx supabase/seed.ts)");
    }
  }
  const data: Catalog = { zones: ZONES, venues: VENUES, routes: ROUTES };
  cache = { data, at: Date.now() };
  return data;
}

export function invalidateCatalogCache() {
  cache = null;
}
