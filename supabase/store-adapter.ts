// supabase/store-adapter.ts
// Adapter ที่มี interface เดียวกับ lib/store.ts แต่ใช้ Supabase แทน JSON file
// วิธีใช้: ตั้ง env SUPABASE_URL + SUPABASE_SERVICE_KEY แล้ว swap ใน lib/store.ts
//
// การ swap: ใน lib/store.ts เปลี่ยน import จาก json-store เป็น supabase-store
//   import { ... } from "../supabase/store-adapter"  // แทน json functions
//
// ถ้าไม่มี env → fallback ไปใช้ JSON store เดิมอัตโนมัติ

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GnEvent, Plan, User } from "../lib/types";

export interface StoreShape {
  users: Record<string, User>;
  plans: Record<string, Plan>;
  saves: { user_id: string; venue_id: string; created_at: string }[];
  events: GnEvent[];
  imports: { user_id: string; url: string; platform: string; status: string; created_at: string }[];
  waitlist: { contact: string; channel: string; source: string | null; pdpa_consent: boolean; created_at: string }[];
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export function isSupabaseEnabled(): boolean {
  return getClient() !== null;
}

// ===== Users =====
export async function ensureUser(id: string): Promise<User> {
  const sb = getClient()!;
  const { data } = await sb.from("users").select("*").eq("id", id).maybeSingle();
  if (data) return data as User;
  const newUser: User = {
    id,
    created_at: new Date().toISOString(),
    budget_defaults: {},
    taste: {},
  };
  await sb.from("users").insert(newUser);
  return newUser;
}

// ===== Plans =====
export async function getPlan(id: string): Promise<Plan | null> {
  const sb = getClient()!;
  const { data } = await sb.from("plans").select("*").eq("id", id).maybeSingle();
  return (data as Plan) ?? null;
}

export async function savePlan(plan: Plan): Promise<void> {
  const sb = getClient()!;
  await sb.from("plans").upsert(plan);
}

export async function donePlansOf(user_id: string): Promise<Plan[]> {
  const sb = getClient()!;
  const { data } = await sb
    .from("plans")
    .select("*")
    .eq("user_id", user_id)
    .eq("status", "done");
  return (data as Plan[]) ?? [];
}

// ===== Saves =====
export async function toggleSave(user_id: string, venue_id: string): Promise<boolean> {
  const sb = getClient()!;
  const { data: existing } = await sb
    .from("saves")
    .select("id")
    .eq("user_id", user_id)
    .eq("venue_id", venue_id)
    .maybeSingle();
  if (existing) {
    await sb.from("saves").delete().eq("id", existing.id);
    return false;
  }
  await sb.from("saves").insert({
    user_id,
    venue_id,
    created_at: new Date().toISOString(),
  });
  return true;
}

export async function savesOf(user_id: string) {
  const sb = getClient()!;
  const { data } = await sb.from("saves").select("*").eq("user_id", user_id);
  return data ?? [];
}

// ===== Events =====
export async function addEvent(user_id: string, type: string, payload: Record<string, unknown> = {}): Promise<void> {
  const sb = getClient()!;
  await sb.from("events").insert({
    user_id,
    type,
    payload,
    created_at: new Date().toISOString(),
  });
}

// ===== Taste (embedded in users.taste jsonb) =====
export async function bumpTaste(user_id: string, key: string): Promise<void> {
  const user = await ensureUser(user_id);
  const taste = { ...user.taste, [key]: (user.taste[key] ?? 0) + 1 };
  const sb = getClient()!;
  await sb.from("users").update({ taste }).eq("id", user_id);
}

// ===== Imports =====
export async function addImport(user_id: string, url: string, platform: string): Promise<void> {
  const sb = getClient()!;
  await sb.from("imports").insert({
    user_id,
    url,
    platform,
    status: "queued",
    created_at: new Date().toISOString(),
  });
}

// ===== PDPA wipe =====
export async function wipeUser(user_id: string): Promise<void> {
  const sb = getClient()!;
  // cascade delete จะจัดการ plans/saves/events/imports ให้
  // (ต้องตั้ง on delete cascade ใน schema — ดู supabase/schema.sql)
  await sb.from("users").delete().eq("id", user_id);
}

// ===== Me (composite query สำหรับ /api/me) =====
export async function getMe(user_id: string) {
  const [user, plans, saves] = await Promise.all([
    ensureUser(user_id),
    getPlansByUser(user_id),
    savesOf(user_id),
  ]);
  return { user, plans, saves };
}

async function getPlansByUser(user_id: string): Promise<Plan[]> {
  const sb = getClient()!;
  const { data } = await sb
    .from("plans")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  return (data as Plan[]) ?? [];
}