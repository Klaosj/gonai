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
  plansOf(user_id: string): Promise<Plan[]>; // ทุกสถานะ ใหม่ → เก่า
  donePlansOf(user_id: string): Promise<Plan[]>;
  toggleSave(user_id: string, venue_id: string): Promise<boolean>; // true = saved
  savedVenueIdsOf(user_id: string): Promise<string[]>;
  addEvent(user_id: string, type: string, payload?: Record<string, unknown>): Promise<void>;
  bumpTaste(user_id: string, key: string): Promise<void>;
  addImport(user_id: string, url: string, platform: string): Promise<void>;
  addWaitlist(entry: Omit<WaitlistEntry, "created_at">): Promise<void>;
}

import { jsonStore } from "./store-json";
import { isSupabaseEnabled, supabaseStore } from "../supabase/store-adapter";

export const store: Store = isSupabaseEnabled() ? supabaseStore : jsonStore;
