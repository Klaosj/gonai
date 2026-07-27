// Store facade — interface เดียว 2 backend:
//   dev  : lib/store-json.ts (JSON file ที่ .data/store.json)
//   prod : supabase/store-adapter.ts (เลือกอัตโนมัติเมื่อตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY)
// ทุก caller ใช้ `store.<fn>` แบบ await เท่านั้น — ห้าม mutate โครงข้างในตรงๆ
import type { Plan, User } from "./types";

export interface WaitlistEntry {
  contact: string;
  channel: string;
  source: string | null;
  pdpa_consent: boolean;
  created_at: string;
}

export interface Store {
  ensureUser(id: string): Promise<User>;
  wipeUser(user_id: string): Promise<void>; // PDPA — ลบทุกตาราง (spec A12)
  migrateUser(oldId: string, newId: string): Promise<void>; // device id → LINE user id
  getPlan(id: string): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<void>;
  deletePlan(id: string): Promise<void>; // Task 2.7 — ลบเฉพาะ draft, เช็ค ownership ที่ชั้น route
  plansOf(user_id: string): Promise<Plan[]>; // ทุกสถานะ ใหม่ → เก่า
  donePlansOf(user_id: string): Promise<Plan[]>;
  toggleSave(user_id: string, venue_id: string): Promise<boolean>; // true = saved
  savedVenueIdsOf(user_id: string): Promise<string[]>;
  addEvent(user_id: string, type: string, payload?: Record<string, unknown>): Promise<void>;
  countEvents(user_id: string, type: string): Promise<number>;
  bumpTaste(user_id: string, key: string): Promise<void>;
  addImport(user_id: string, url: string, platform: string): Promise<void>;
  importsOf(user_id: string): Promise<{ url: string; platform: string; status: string; created_at: string }[]>;
  addWaitlist(entry: Omit<WaitlistEntry, "created_at">): Promise<void>;
}

import { jsonStore } from "./store-json";
import { isSupabaseEnabled, supabaseStore } from "../supabase/store-adapter";

// เลือก backend ตอน "ใช้" ไม่ใช่ตอน import — next build (NODE_ENV=production) import route
// ทุกตัวโดยไม่มี Supabase env ซึ่งต้องยัง build ผ่าน · แต่ runtime prod ที่ env หาย ต้องตายดังๆ
// ทันทีที่มีใครแตะ store ไม่ใช่ไปตายเงียบๆ ใน fs.writeFileSync บน filesystem read-only ของ Vercel
export function resolveStore(): Store {
  if (isSupabaseEnabled()) return supabaseStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase env missing in production: set SUPABASE_URL + SUPABASE_SERVICE_KEY (JSON store is dev-only)",
    );
  }
  return jsonStore;
}

export const store: Store = new Proxy({} as Store, {
  get(_t, prop) {
    const s = resolveStore();
    const v = s[prop as keyof Store];
    return typeof v === "function" ? v.bind(s) : v;
  },
});
