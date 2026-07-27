// import type เท่านั้น — server.ts import type จาก types.ts อยู่แล้ว ไม่มี runtime circular (T2.1)
import type { ExpandedPlan } from "./server";

export type Intent = "work" | "date" | "family" | "photo";

export type Badge = "hit" | "unseen";

export type Plugs = "none" | "some" | "all";
export type Noise = "quiet" | "medium" | "loud";
export type FoodLevel = "drinks" | "snacks" | "meals";

export interface VenueAttributes {
  plugs: Plugs;
  wifi_mbps: number | null;
  seat_hours: number | null; // 999 = ไม่จำกัด
  noise: Noise;
  parking: boolean;
  food_level: FoodLevel;
  indoor: boolean;
  shade: boolean;
}

export interface Venue {
  id: string;
  name_th: string;
  zone_id: string;
  category: "cafe" | "restaurant" | "activity" | "market";
  intents: Intent[];
  badge: Badge;
  hit_rank: number | null;
  unseen_rank: number | null;
  transition_rank: number | null;
  attributes: VenueAttributes;
  price_per_head_min: number;
  price_per_head_max: number;
  open_time: string; // "09:00"
  close_time: string; // "21:00"
  walk_min_from_hub: number;
  video_url: string | null;
  source: "sprint" | "tat" | "import";
  last_validated_at: string; // ISO date
  validation_count: number;
}

export interface Zone {
  id: string;
  name_th: string;
  is_origin: boolean;
  km_to_siam: number;
}

export type LegMode =
  | "walk"
  | "win"
  | "boat"
  | "bts"
  | "mrt"
  | "songthaew"
  | "van"
  | "grab";

export interface RouteLeg {
  route_id: string;
  seq: number;
  mode: LegMode;
  detail_th: string;
  price_min: number;
  price_max: number;
  minutes: number;
  warning_th: string | null;
}

export interface Route {
  id: string;
  origin_zone: string;
  dest_zone: string;
  kind: "cheapest" | "fastest";
  legs: RouteLeg[];
}

export interface PlanStop {
  seq: number;
  venue_id: string;
  est_cost: number;
  actual_cost: number | null;
  checked_in_at: string | null;
}

export interface Plan {
  id: string;
  user_id: string;
  intent: Intent;
  origin_zone: string;
  status: "draft" | "active" | "done";
  route_kind: "cheapest" | "fastest";
  budget_planned: number;
  budget_actual: number | null;
  stops: PlanStop[];
  created_at: string;
}

export interface User {
  id: string;
  created_at: string;
  budget_defaults: Partial<Record<Intent, number>>;
  taste: Record<string, number>;
}

export interface GnEvent {
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// /api/me response — ฉบับเต็มตรงกับ app/api/me/route.ts ทุก field (ย้ายมาจาก me/page.tsx, T2.1)
// ใช้ร่วมกันโดย MeProvider (lib/me-context.tsx) + shell.tsx + me/page.tsx + planner-client.tsx
export interface MeResponse {
  saves: Venue[];
  plans: ExpandedPlan[];
  imports: { url: string; platform: string; status: string; created_at: string }[];
  taste: Record<string, number>;
  priceConfirms: number;
  auth: { provider: "line" | "anonymous"; displayName: string | null };
}

export const INTENT_LABELS: Record<Intent, string> = {
  work: "Work",
  date: "Date",
  family: "Family",
  photo: "Photo",
};

export const MODE_LABELS: Record<LegMode, string> = {
  walk: "Walk",
  win: "Win bike",
  boat: "Boat",
  bts: "BTS",
  mrt: "MRT",
  songthaew: "Songthaew",
  van: "Van",
  grab: "Grab",
};
