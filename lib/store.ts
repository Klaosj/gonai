// Dev store: JSON file ที่ .data/store.json — โครง function เขียนให้ swap เป็น Supabase ได้
// (spec 2.1 pin Supabase — deviation นี้เพราะ dev เครื่อง local ยังไม่มี credentials)
//
// MIGRATION ไป Supabase:
//   1. รัน supabase/schema.sql ใน Supabase SQL Editor
//   2. ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env
//   3. ติดตั้ง dep: npm install @supabase/supabase-js
//   4. เปลี่ยน caller ใน app/api/*/route.ts จาก sync → async (เพิ่ม await)
//   5. import จาก supabase/store-adapter.ts แทน lib/store.ts
//
// ตอนนี้ JSON store ใช้ต่อไปได้ — Supabase adapter พร้อมใช้ทันทีที่มี credentials
import fs from "fs";
import path from "path";
import type { GnEvent, Plan, User } from "./types";

export interface StoreShape {
  users: Record<string, User>;
  plans: Record<string, Plan>;
  saves: { user_id: string; venue_id: string; created_at: string }[];
  events: GnEvent[];
  imports: { user_id: string; url: string; platform: string; status: string; created_at: string }[];
  waitlist: { contact: string; channel: string; source: string | null; pdpa_consent: boolean; created_at: string }[];
}

const EMPTY: StoreShape = { users: {}, plans: {}, saves: [], events: [], imports: [], waitlist: [] };

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const g = globalThis as unknown as { __gnStore?: StoreShape };

function load(): StoreShape {
  if (g.__gnStore) return g.__gnStore;
  try {
    g.__gnStore = { ...EMPTY, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch {
    g.__gnStore = structuredClone(EMPTY);
  }
  return g.__gnStore!;
}

export function persist() {
  const store = load();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export function getStore(): StoreShape {
  return load();
}

export function ensureUser(id: string): User {
  const store = load();
  if (!store.users[id]) {
    store.users[id] = { id, created_at: new Date().toISOString(), budget_defaults: {}, taste: {} };
    persist();
  }
  return store.users[id];
}

export function addEvent(user_id: string, type: string, payload: Record<string, unknown> = {}) {
  const store = load();
  store.events.push({ user_id, type, payload, created_at: new Date().toISOString() });
  persist();
}

export function bumpTaste(user_id: string, key: string) {
  const user = ensureUser(user_id);
  user.taste[key] = (user.taste[key] ?? 0) + 1;
  persist();
}

export function donePlansOf(user_id: string): Plan[] {
  const store = load();
  return Object.values(store.plans).filter((p) => p.user_id === user_id && p.status === "done");
}

// PDPA: ลบข้อมูลผู้ใช้ทุกตาราง (spec S5 / A12)
export function wipeUser(user_id: string) {
  const store = load();
  delete store.users[user_id];
  for (const [id, p] of Object.entries(store.plans)) if (p.user_id === user_id) delete store.plans[id];
  store.saves = store.saves.filter((s) => s.user_id !== user_id);
  store.events = store.events.filter((e) => e.user_id !== user_id);
  store.imports = store.imports.filter((i) => i.user_id !== user_id);
  persist();
}
