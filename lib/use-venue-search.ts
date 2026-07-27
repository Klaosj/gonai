"use client";
// ค้นหาร้าน (S1 conditions: intent/origin/budget/filters) + โหลดผลลัพธ์จาก /api/venues
// แยกออกจาก app/app/planner-client.tsx (T1.7 — ย้าย ไม่ใช่เขียนใหม่) — เป็นเจ้าของ state การค้นร้าน
// ทั้งหมด ที่ PlannerClient และ ChatPanel ใช้ร่วมกัน
// onLoaded ให้ใครก็ตาม (ChatPanel ตอบ chat ค้าง, PlannerClient รีเซ็ต saved) ลงทะเบียนฟังผลโหลดสำเร็จ
// แทน pendingChat resolution เดิมที่เคยอยู่ inline ใน load()
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { gn, track } from "./api";
import { filtersToParams, type VenueFilters } from "./filters";
import { BUDGET_DEFAULTS } from "./fixtures";
import type { Intent, Route, Venue, Zone } from "./types";
import type { RainForecast } from "./weather";

// 4 intents จริงเท่านั้น — "กินของอร่อย/ธรรมชาติ" เดิมเป็นปุ่มหลอก (ผลลัพธ์เป็น work) เลยตัดออก
export const INTENTS: { key: Intent; label: string }[] = [
  { key: "work", label: "💻 Work" },
  { key: "date", label: "💛 Date" },
  { key: "photo", label: "📷 Photo" },
  { key: "family", label: "👨‍👩‍👧 Family" },
];

export const round50 = (x: number) => Math.round(x / 50) * 50;

// onboarding (/app/welcome) เขียน gn_pref ไว้ — planner อ่านตอน init เท่านั้น (ครั้งแรกของ session)
function readGnPref(): { vibe?: "quiet" | "loud" | "food" | "photo"; budgetMul?: number } {
  try {
    return JSON.parse(localStorage.getItem("gn_pref") ?? "{}");
  } catch {
    return {};
  }
}

export interface VenuesResponse {
  cards: Venue[];
  more: Venue[];
  total: number;
  unseenPoolEmpty: boolean;
  savedIds: string[];
  routes: { cheapest: Route; fastest: Route; fallback: boolean };
  weather: RainForecast | null;
  zones: Zone[];
}

export function useVenueSearch() {
  const sp = useSearchParams();
  // deep link จริง (?add= หรือ ?intent=) ต้องชนะเสมอ — ค่า default จาก onboarding (gn_pref) ใช้เฉพาะตอนไม่มี deep link
  const hasDeepLink = !!(sp.get("add") || sp.get("intent"));
  const [intent, setIntent] = useState<Intent>(() => {
    const q = sp.get("intent");
    if (INTENTS.some((i) => i.key === q)) return q as Intent;
    if (!sp.get("add") && readGnPref().vibe === "photo") return "photo";
    return "work";
  });
  const [origin, setOrigin] = useState(() => {
    if (sp.get("origin")) return sp.get("origin")!;
    try {
      return localStorage.getItem("gn_origin") ?? "bangkapi";
    } catch {
      return "bangkapi";
    }
  });
  const [budget, setBudget] = useState<number>(() => {
    const q = sp.get("budget");
    if (q) return Number(q);
    if (!sp.get("add")) {
      const mul = readGnPref().budgetMul;
      if (typeof mul === "number") return round50(BUDGET_DEFAULTS[intent] * mul);
    }
    return BUDGET_DEFAULTS[intent] ?? 800;
  });
  const [filters, setFilters] = useState<VenueFilters>(() => {
    if (hasDeepLink) return {};
    const vibe = readGnPref().vibe;
    if (vibe === "quiet") return { quiet: true };
    if (vibe === "food") return { food: true };
    return {};
  });

  const [data, setData] = useState<VenuesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const listenersRef = useRef<Set<(d: VenuesResponse) => void>>(new Set());

  // ให้ใครก็ตาม (ChatPanel ตอบ chat ค้าง, PlannerClient รีเซ็ต saved) ลงทะเบียนฟังผลโหลดสำเร็จ
  const onLoaded = useCallback((cb: (d: VenuesResponse) => void) => {
    listenersRef.current.add(cb);
  }, []);

  const load = useCallback(() => {
    setLoadError(false);
    gn<VenuesResponse>(`/api/venues?intent=${intent}&origin=${origin}${filtersToParams(filters)}`)
      .then((d) => {
        setData(d);
        track("results_view", { intent, origin, total: d.total });
        listenersRef.current.forEach((cb) => cb(d));
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [intent, origin, filters]);

  useEffect(load, [load]);

  const pickOrigin = useCallback((id: string) => {
    setOrigin(id);
    try {
      localStorage.setItem("gn_origin", id);
    } catch {}
    track("origin_change", { origin: id });
  }, []);

  const toggleFilter = useCallback((key: keyof VenueFilters) => {
    setFilters((f) => {
      const next = { ...f, [key]: !f[key] };
      track("filter_toggle", { key, on: !f[key] });
      return next;
    });
  }, []);

  // Mood tiles (plan §1) เรียกใช้ — แตะเดียว = ตั้ง intent+filters+budget จริงทีเดียวแล้ว refetch
  const pickMood = useCallback((m: { key: Intent; filters: VenueFilters }) => {
    setIntent(m.key);
    setFilters(m.filters);
    setBudget(BUDGET_DEFAULTS[m.key]);
    track("mood_tile", { intent: m.key });
  }, []);

  return {
    intent,
    setIntent,
    origin,
    setOrigin,
    pickOrigin,
    budget,
    setBudget,
    filters,
    setFilters,
    toggleFilter,
    data,
    loadError,
    reload: load,
    onLoaded,
    pickMood,
  };
}
