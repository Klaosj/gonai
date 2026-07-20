// JSON file backend สำหรับ dev เครื่อง local — ห้ามใช้ production
// (serverless/Vercel ระบบไฟล์เป็น ephemeral — ข้อมูลหายทุก cold start)
// production ใช้ supabase/store-adapter.ts ผ่าน facade ใน lib/store.ts
import fs from "fs";
import path from "path";
import type { Plan, User } from "./types";
import type { Store, WaitlistEntry } from "./store";

interface StoreShape {
  users: Record<string, User>;
  plans: Record<string, Plan>;
  saves: { user_id: string; venue_id: string; created_at: string }[];
  events: { user_id: string; type: string; payload: Record<string, unknown>; created_at: string }[];
  imports: { user_id: string; url: string; platform: string; status: string; created_at: string }[];
  waitlist: WaitlistEntry[];
}

const EMPTY: StoreShape = { users: {}, plans: {}, saves: [], events: [], imports: [], waitlist: [] };

const DATA_FILE = process.env.GN_DATA_FILE ?? path.join(process.cwd(), ".data", "store.json");

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

function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(load(), null, 2));
}

function ensureUserSync(id: string): User {
  const s = load();
  if (!s.users[id]) {
    s.users[id] = { id, created_at: new Date().toISOString(), budget_defaults: {}, taste: {} };
    persist();
  }
  return s.users[id];
}

export const jsonStore: Store = {
  async ensureUser(id) {
    return ensureUserSync(id);
  },

  async wipeUser(user_id) {
    const s = load();
    delete s.users[user_id];
    for (const [id, p] of Object.entries(s.plans)) if (p.user_id === user_id) delete s.plans[id];
    s.saves = s.saves.filter((x) => x.user_id !== user_id);
    s.events = s.events.filter((x) => x.user_id !== user_id);
    s.imports = s.imports.filter((x) => x.user_id !== user_id);
    persist();
  },

  // ย้ายข้อมูล device id เดิม → LINE user id (taste รวมแบบบวกนับ)
  async migrateUser(oldId, newId) {
    const s = load();
    const oldUser = s.users[oldId];
    if (!oldUser) return;
    const newUser = ensureUserSync(newId);
    for (const [k, n] of Object.entries(oldUser.taste)) {
      newUser.taste[k] = (newUser.taste[k] ?? 0) + n;
    }
    for (const p of Object.values(s.plans)) if (p.user_id === oldId) p.user_id = newId;
    for (const x of s.saves) if (x.user_id === oldId) x.user_id = newId;
    for (const x of s.events) if (x.user_id === oldId) x.user_id = newId;
    for (const x of s.imports) if (x.user_id === oldId) x.user_id = newId;
    delete s.users[oldId];
    persist();
  },

  async getPlan(id) {
    return load().plans[id] ?? null;
  },

  async savePlan(plan) {
    load().plans[plan.id] = plan;
    persist();
  },

  async plansOf(user_id) {
    return Object.values(load().plans)
      .filter((p) => p.user_id === user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async donePlansOf(user_id) {
    return Object.values(load().plans).filter((p) => p.user_id === user_id && p.status === "done");
  },

  async toggleSave(user_id, venue_id) {
    const s = load();
    const i = s.saves.findIndex((x) => x.user_id === user_id && x.venue_id === venue_id);
    let saved: boolean;
    if (i >= 0) {
      s.saves.splice(i, 1);
      saved = false;
    } else {
      s.saves.push({ user_id, venue_id, created_at: new Date().toISOString() });
      saved = true;
    }
    persist();
    return saved;
  },

  async savedVenueIdsOf(user_id) {
    return load().saves.filter((x) => x.user_id === user_id).map((x) => x.venue_id);
  },

  async addEvent(user_id, type, payload = {}) {
    load().events.push({ user_id, type, payload, created_at: new Date().toISOString() });
    persist();
  },

  async bumpTaste(user_id, key) {
    const user = ensureUserSync(user_id);
    user.taste[key] = (user.taste[key] ?? 0) + 1;
    persist();
  },

  async addImport(user_id, url, platform) {
    load().imports.push({ user_id, url, platform, status: "queued", created_at: new Date().toISOString() });
    persist();
  },

  async importsOf(user_id) {
    return load()
      .imports.filter((x) => x.user_id === user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ url, platform, status, created_at }) => ({ url, platform, status, created_at }));
  },

  async addWaitlist(entry) {
    load().waitlist.push({ ...entry, created_at: new Date().toISOString() });
    persist();
  },
};
