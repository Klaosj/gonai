// Supabase backend — implement interface เดียวกับ lib/store-json.ts (ดู lib/store.ts)
// เปิดใช้: ตั้ง SUPABASE_URL + SUPABASE_SERVICE_KEY ใน .env แล้ว facade เลือกตัวนี้อัตโนมัติ
// schema: supabase/schema.sql · seed venues/routes: npx tsx supabase/seed.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Route, User, Venue, Zone } from "../lib/types";
import type { Store } from "../lib/store";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function isSupabaseEnabled(): boolean {
  return getClient() !== null;
}

function sb(): SupabaseClient {
  const c = getClient();
  if (!c) throw new Error("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)");
  return c;
}

// insert/update ที่พลาดต้องดังไม่ใช่เงียบ — ผู้ใช้ควรเห็น 500 ไม่ใช่ข้อมูลหายเฉยๆ
function must(op: string, error: { message: string } | null) {
  if (error) throw new Error(`supabase ${op}: ${error.message}`);
}

export const supabaseStore: Store = {
  async ensureUser(id) {
    const { data } = await sb().from("users").select("*").eq("id", id).maybeSingle();
    if (data) return data as User;
    const user: User = { id, created_at: new Date().toISOString(), budget_defaults: {}, taste: {} };
    // upsert กัน race ตอนหลาย request แรกยิงพร้อมกัน
    const { error } = await sb().from("users").upsert(user, { onConflict: "id" });
    must("ensureUser", error);
    return user;
  },

  async wipeUser(user_id) {
    // on delete cascade ใน schema จัดการ plans/saves/events/imports
    const { error } = await sb().from("users").delete().eq("id", user_id);
    must("wipeUser", error);
  },

  async migrateUser(oldId, newId) {
    const { data: oldUser } = await sb().from("users").select("*").eq("id", oldId).maybeSingle();
    if (!oldUser) return;
    const newUser = await this.ensureUser(newId);
    const taste = { ...newUser.taste };
    for (const [k, n] of Object.entries((oldUser as User).taste ?? {})) {
      taste[k] = (taste[k] ?? 0) + (n as number);
    }
    must("migrate taste", (await sb().from("users").update({ taste }).eq("id", newId)).error);
    for (const table of ["plans", "saves", "events", "imports"]) {
      must(`migrate ${table}`, (await sb().from(table).update({ user_id: newId }).eq("user_id", oldId)).error);
    }
    must("migrate cleanup", (await sb().from("users").delete().eq("id", oldId)).error);
  },

  async getPlan(id) {
    const { data } = await sb().from("plans").select("*").eq("id", id).maybeSingle();
    return (data as Plan) ?? null;
  },

  async savePlan(plan) {
    const { error } = await sb().from("plans").upsert(plan, { onConflict: "id" });
    must("savePlan", error);
  },

  // Task 2.7 — ลบ plan เฉพาะ id ที่ขอ
  async deletePlan(id) {
    must("deletePlan", (await sb().from("plans").delete().eq("id", id)).error);
  },

  async plansOf(user_id) {
    const { data } = await sb()
      .from("plans")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    return (data as Plan[]) ?? [];
  },

  async donePlansOf(user_id) {
    const { data } = await sb().from("plans").select("*").eq("user_id", user_id).eq("status", "done");
    return (data as Plan[]) ?? [];
  },

  async toggleSave(user_id, venue_id) {
    const { data: existing } = await sb()
      .from("saves")
      .select("id")
      .eq("user_id", user_id)
      .eq("venue_id", venue_id)
      .maybeSingle();
    if (existing) {
      must("unsave", (await sb().from("saves").delete().eq("id", existing.id)).error);
      return false;
    }
    must(
      "save",
      (await sb().from("saves").insert({ user_id, venue_id, created_at: new Date().toISOString() })).error,
    );
    return true;
  },

  async savedVenueIdsOf(user_id) {
    const { data } = await sb().from("saves").select("venue_id").eq("user_id", user_id);
    return (data ?? []).map((r) => r.venue_id as string);
  },

  async addEvent(user_id, type, payload = {}) {
    // fire-and-forget — event หายไม่ต้องล้ม request
    await sb().from("events").insert({ user_id, type, payload, created_at: new Date().toISOString() });
  },

  async countEvents(user_id, type) {
    const { count, error } = await sb()
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("type", type);
    must("countEvents", error);
    return count ?? 0;
  },

  async bumpTaste(user_id, key) {
    const user = await this.ensureUser(user_id);
    const taste = { ...user.taste, [key]: (user.taste[key] ?? 0) + 1 };
    must("bumpTaste", (await sb().from("users").update({ taste }).eq("id", user_id)).error);
  },

  async addImport(user_id, url, platform) {
    must(
      "addImport",
      (await sb().from("imports").insert({ user_id, url, platform, status: "queued", created_at: new Date().toISOString() })).error,
    );
  },

  async importsOf(user_id) {
    const { data } = await sb()
      .from("imports")
      .select("url,platform,status,created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    return (data ?? []) as { url: string; platform: string; status: string; created_at: string }[];
  },

  async addWaitlist(entry) {
    must("addWaitlist", (await sb().from("waitlist").insert({ ...entry, created_at: new Date().toISOString() })).error);
  },
};

// ===== Catalog (venues/routes/zones — content ที่ทีม field ops แก้ได้โดยไม่ต้อง deploy) =====

export interface DbCatalog {
  zones: Zone[];
  venues: Venue[];
  routes: Route[];
}

// null = ตารางยังว่าง (ยังไม่ได้ seed) → caller fallback ไป fixtures
export async function fetchCatalog(): Promise<DbCatalog | null> {
  const [zones, venues, routes] = await Promise.all([
    sb().from("zones").select("*"),
    sb().from("venues").select("*"),
    sb().from("routes").select("*"),
  ]);
  must("fetch zones", zones.error);
  must("fetch venues", venues.error);
  must("fetch routes", routes.error);
  if (!venues.data?.length) return null;
  return {
    zones: (zones.data as Zone[]) ?? [],
    venues: venues.data as Venue[],
    routes: (routes.data as Route[]) ?? [],
  };
}

export async function upsertCatalog(catalog: DbCatalog): Promise<void> {
  must("seed zones", (await sb().from("zones").upsert(catalog.zones, { onConflict: "id" })).error);
  must("seed venues", (await sb().from("venues").upsert(catalog.venues, { onConflict: "id" })).error);
  must("seed routes", (await sb().from("routes").upsert(catalog.routes, { onConflict: "id" })).error);
}
