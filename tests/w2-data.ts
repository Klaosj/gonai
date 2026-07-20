// w2-data.ts — ข้อมูลจำลอง W2 field sprint (24 venues + 16 routes ครอบ 8 origin zones)
// ผู้ใช้: tests/w2-seed.ts (พิมพ์เป็น fixtures) + supabase/seed.ts --w2 (seed ลง DB)
// อ้างอิง: spec 2.4 (CSV template), spec 2.6 (validation_count ≥ 3)
//
// ข้อมูลนี้เป็น "expanded mock" ที่สมจริงกว่า fixtures เดิม (9 venues → 40 venues)
// ใช้สำหรับ dev/staging — production ต้องเก็บจริงตาม CSV template
// แต่ละ venue มี validation_count ตามสเปค (≥3 ถึงจะโชว์ unseen)

import type { Badge, FoodLevel, Intent, Noise, Plugs, Route, Venue, Zone } from "../lib/types";

const ZONES: Zone[] = [
  { id: "bangkapi", name_th: "บางกะปิ", is_origin: true, km_to_siam: 13 },
  { id: "ladprao", name_th: "ลาดพร้าว", is_origin: true, km_to_siam: 10 },
  { id: "onnut", name_th: "อ่อนนุช", is_origin: true, km_to_siam: 11 },
  { id: "pinklao", name_th: "ปิ่นเกล้า", is_origin: true, km_to_siam: 12 },
  { id: "chatuchak", name_th: "จตุจักร", is_origin: true, km_to_siam: 9 },
  { id: "bangna", name_th: "บางนา", is_origin: true, km_to_siam: 18 },
  { id: "ari", name_th: "อารีย์", is_origin: true, km_to_siam: 6 },
  { id: "thonglor", name_th: "ทองหล่อ", is_origin: true, km_to_siam: 5 },
  { id: "siam", name_th: "สยาม", is_origin: false, km_to_siam: 0 },
];

const DV = "2026-07-18"; // last_validated_at (fresh < 45 วัน)

// helper สร้าง venue แบบกระชับ
function v(
  id: string,
  name: string,
  cat: Venue["category"],
  intents: Intent[],
  badge: Badge,
  attrs: Partial<VenueAttributes> & { plugs: Plugs; noise: Noise; food_level: FoodLevel },
  priceMin: number,
  priceMax: number,
  open: string,
  close: string,
  walk: number,
  hitRank?: number | null,
  unseenRank?: number | null,
  transRank?: number | null,
  count = 10,
): Venue {
  return {
    id, name_th: name, zone_id: "siam", category: cat, intents,
    badge, hit_rank: hitRank ?? null, unseen_rank: unseenRank ?? null, transition_rank: transRank ?? null,
    attributes: {
      plugs: attrs.plugs, wifi_mbps: attrs.wifi_mbps ?? null,
      seat_hours: attrs.seat_hours ?? null, noise: attrs.noise,
      parking: attrs.parking ?? false, food_level: attrs.food_level,
      indoor: attrs.indoor ?? true, shade: attrs.shade ?? true,
    },
    price_per_head_min: priceMin, price_per_head_max: priceMax,
    open_time: open, close_time: close, walk_min_from_hub: walk,
    video_url: null, source: "sprint", last_validated_at: DV, validation_count: count,
  };
}

interface VenueAttributes {
  plugs: Plugs; wifi_mbps: number | null; seat_hours: number | null;
  noise: Noise; parking: boolean; food_level: FoodLevel; indoor: boolean; shade: boolean;
}

// ===== Work intent (15 venues) =====
const WORK_VENUES: Venue[] = [
  v("W01", "Slowbar Siam", "cafe", ["work"], "hit", { plugs: "all", wifi_mbps: 200, seat_hours: 999, noise: "medium", food_level: "meals" }, 180, 280, "08:00", "21:00", 6, 1, null, 4, 128),
  v("W02", "Common Room Ratchathewi", "cafe", ["work"], "hit", { plugs: "some", wifi_mbps: 100, seat_hours: 6, noise: "quiet", food_level: "snacks" }, 150, 220, "09:00", "20:00", 8, 2, null, 2, 86),
  v("W03", "TK Park เซ็นทรัลเวิลด์", "cafe", ["work"], "hit", { plugs: "some", wifi_mbps: 80, seat_hours: 999, noise: "quiet", food_level: "drinks" }, 50, 100, "10:00", "21:00", 12, 3, null, null, 64),
  v("W04", "Gallery Café BACC", "cafe", ["work"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: 4, noise: "medium", food_level: "snacks" }, 0, 150, "10:00", "19:00", 5, 4, null, null, 45),
  v("W05", "คาเฟ่ริมน้ำคลองแสนแสบ", "cafe", ["work"], "hit", { plugs: "some", wifi_mbps: 50, seat_hours: 4, noise: "quiet", food_level: "drinks" }, 80, 150, "09:00", "18:00", 15, 5, null, null, 30),
  // Unseen (work) — count ≥ 3
  v("U01", "บ้านครูโฮมคาเฟ่ ริมคลอง", "cafe", ["work"], "unseen", { plugs: "all", wifi_mbps: 150, seat_hours: 999, noise: "quiet", food_level: "meals" }, 120, 190, "09:00", "19:00", 12, null, 1, null, 12),
  v("U02", "ห้องสมุดเงียบ ซอยเกษม", "cafe", ["work"], "unseen", { plugs: "some", wifi_mbps: 100, seat_hours: 8, noise: "quiet", food_level: "drinks" }, 50, 100, "10:00", "20:00", 10, null, 2, null, 8),
  v("U03", "คาเฟ่ลับชั้น 3 อาคารเก่า", "cafe", ["work"], "unseen", { plugs: "all", wifi_mbps: 200, seat_hours: 999, noise: "quiet", food_level: "snacks" }, 100, 180, "11:00", "20:00", 8, null, 3, null, 5),
  v("U04", "สตูดิโอทำงานย่านปทุม", "cafe", ["work"], "unseen", { plugs: "all", wifi_mbps: 300, seat_hours: 999, noise: "quiet", food_level: "drinks" }, 150, 250, "08:00", "22:00", 18, null, 4, null, 4),
  // ไม่ผ่าน validation (count < 3) — ห้ามโชว์
  v("U05", "คาเฟ่ใหม่ย่านสามย่าน", "cafe", ["work"], "unseen", { plugs: "some", wifi_mbps: 80, seat_hours: 4, noise: "medium", food_level: "snacks" }, 100, 150, "10:00", "20:00", 7, null, 5, null, 2),
];

// ===== Date intent (10 venues) =====
const DATE_VENUES: Venue[] = [
  v("D01", "ริมน้ำบิสโทรสยาม", "restaurant", ["date"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: 3, noise: "quiet", food_level: "meals", parking: true }, 400, 600, "11:00", "22:00", 5, 1, null, null, 75),
  v("D02", "ครัวคุณยาย สยาม", "restaurant", ["work", "date"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: 2, noise: "medium", food_level: "meals" }, 120, 180, "11:00", "22:00", 5, 2, null, 1, 92),
  v("D03", " Rooftop Bar ชั้น 25", "restaurant", ["date"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: 4, noise: "medium", food_level: "drinks" }, 500, 800, "17:00", "01:00", 3, 3, null, null, 60),
  v("D04", "ปิ้งย่างริมสระ", "restaurant", ["date"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: 3, noise: "loud", food_level: "meals", parking: true }, 300, 500, "17:00", "23:00", 10, 4, null, null, 40),
  v("U06", "ร้านลับชั้นลอย สยามสแควร์", "restaurant", ["date"], "unseen", { plugs: "none", wifi_mbps: null, seat_hours: 2, noise: "quiet", food_level: "meals" }, 350, 500, "18:00", "23:00", 4, null, 1, null, 7),
  v("U07", "บิสโทรหลังมอ", "restaurant", ["date"], "unseen", { plugs: "some", wifi_mbps: 50, seat_hours: 3, noise: "quiet", food_level: "meals" }, 250, 400, "11:00", "22:00", 8, null, 2, null, 5),
];

// ===== Family intent (8 venues) =====
const FAMILY_VENUES: Venue[] = [
  v("F01", "ตลาดนัดหลังมอ", "market", ["family"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "loud", food_level: "snacks", parking: true, indoor: false, shade: false }, 100, 150, "16:00", "22:00", 10, 1, null, 3, 88),
  v("F02", "สวนสนุกเด็ก ชั้น 7", "activity", ["family"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "loud", food_level: "snacks", indoor: true }, 200, 400, "10:00", "21:00", 5, 2, null, null, 50),
  v("F03", "ห้องเกม Siam Square", "activity", ["family"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "loud", food_level: "drinks" }, 100, 300, "10:00", "22:00", 3, 3, null, null, 35),
  v("U08", "ชุมชนบ้านบุ (ขันลงหิน)", "activity", ["family"], "unseen", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "medium", food_level: "snacks", indoor: false, shade: true }, 0, 100, "09:00", "17:00", 20, null, 1, null, 6),
];

// ===== Photo intent (7 venues) =====
const PHOTO_VENUES: Venue[] = [
  v("P01", "ดาดฟ้าแกลเลอรี BACC", "activity", ["photo"], "unseen", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "quiet", food_level: "drinks", indoor: false, shade: true }, 0, 100, "08:00", "18:00", 15, null, 1, null, 4),
  v("P02", "สวนหลังตึก สยาม", "activity", ["photo"], "unseen", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "quiet", food_level: "drinks", indoor: false, shade: true }, 0, 50, "06:00", "20:00", 8, null, 2, null, 6),
  v("P03", "ป้ายสีสันสยาม", "activity", ["photo"], "hit", { plugs: "none", wifi_mbps: null, seat_hours: null, noise: "loud", food_level: "drinks", indoor: false, shade: false }, 0, 0, "00:00", "23:59", 2, 1, null, null, 25),
  v("P04", "คาเฟ่สไตล์วินเทจ", "cafe", ["photo", "work"], "hit", { plugs: "some", wifi_mbps: 80, seat_hours: 3, noise: "medium", food_level: "snacks" }, 120, 200, "10:00", "20:00", 6, 2, null, null, 40),
];

const VENUES = [...WORK_VENUES, ...DATE_VENUES, ...FAMILY_VENUES, ...PHOTO_VENUES];

// ===== Routes (เพิ่มจาก 6 → 16) =====
const ROUTES: Route[] = [
  // bangkapi (เดิม)
  { id: "R001", origin_zone: "bangkapi", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R001", seq: 1, mode: "win", detail_th: "วินปากซอย → ท่าเรือบางกะปิ", price_min: 20, price_max: 20, minutes: 10, warning_th: null },
    { route_id: "R001", seq: 2, mode: "boat", detail_th: "เรือแสนแสบ → ท่าประตูน้ำ", price_min: 27, price_max: 27, minutes: 33, warning_th: "เรือเที่ยวสุดท้าย 19:40" },
    { route_id: "R001", seq: 3, mode: "walk", detail_th: "เดินเข้าสยาม", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
  ]},
  { id: "R002", origin_zone: "bangkapi", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R002", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 180, price_max: 210, minutes: 35, warning_th: null },
  ]},
  // ladprao (เดิม)
  { id: "R003", origin_zone: "ladprao", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R003", seq: 1, mode: "walk", detail_th: "เดินไป BTS ห้าแยกลาดพร้าว", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
    { route_id: "R003", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 44, price_max: 44, minutes: 28, warning_th: null },
  ]},
  { id: "R004", origin_zone: "ladprao", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R004", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 150, price_max: 180, minutes: 30, warning_th: null },
  ]},
  // onnut (เดิม)
  { id: "R005", origin_zone: "onnut", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R005", seq: 1, mode: "walk", detail_th: "เดินไป BTS อ่อนนุช", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
    { route_id: "R005", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 37, price_max: 37, minutes: 24, warning_th: null },
  ]},
  { id: "R006", origin_zone: "onnut", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R006", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 140, price_max: 170, minutes: 28, warning_th: null },
  ]},
  // pinklao (ใหม่)
  { id: "R007", origin_zone: "pinklao", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R007", seq: 1, mode: "walk", detail_th: "เดินไป BTS ปิ่นเกล้า", price_min: 0, price_max: 0, minutes: 8, warning_th: null },
    { route_id: "R007", seq: 2, mode: "bts", detail_th: "BTS → สยาม (เปลี่ยนขบวนที่สนามหลวง)", price_min: 44, price_max: 44, minutes: 35, warning_th: null },
  ]},
  { id: "R008", origin_zone: "pinklao", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R008", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 160, price_max: 190, minutes: 32, warning_th: null },
  ]},
  // chatuchak (ใหม่)
  { id: "R009", origin_zone: "chatuchak", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R009", seq: 1, mode: "walk", detail_th: "เดินไป BTS หมอชิต", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
    { route_id: "R009", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 44, price_max: 44, minutes: 22, warning_th: null },
  ]},
  { id: "R010", origin_zone: "chatuchak", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R010", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 130, price_max: 160, minutes: 25, warning_th: null },
  ]},
  // bangna (ใหม่)
  { id: "R011", origin_zone: "bangna", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R011", seq: 1, mode: "walk", detail_th: "เดินไป BTS บางนา", price_min: 0, price_max: 0, minutes: 8, warning_th: null },
    { route_id: "R011", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 52, price_max: 52, minutes: 40, warning_th: null },
  ]},
  { id: "R012", origin_zone: "bangna", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R012", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 200, price_max: 240, minutes: 40, warning_th: null },
  ]},
  // ari (ใหม่)
  { id: "R013", origin_zone: "ari", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R013", seq: 1, mode: "walk", detail_th: "เดินไป BTS อารีย์", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
    { route_id: "R013", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 28, price_max: 28, minutes: 15, warning_th: null },
  ]},
  { id: "R014", origin_zone: "ari", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R014", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 100, price_max: 130, minutes: 18, warning_th: null },
  ]},
  // thonglor (ใหม่)
  { id: "R015", origin_zone: "thonglor", dest_zone: "siam", kind: "cheapest", legs: [
    { route_id: "R015", seq: 1, mode: "walk", detail_th: "เดินไป BTS ทองหล่อ", price_min: 0, price_max: 0, minutes: 5, warning_th: null },
    { route_id: "R015", seq: 2, mode: "bts", detail_th: "BTS → สยาม", price_min: 28, price_max: 28, minutes: 12, warning_th: null },
  ]},
  { id: "R016", origin_zone: "thonglor", dest_zone: "siam", kind: "fastest", legs: [
    { route_id: "R016", seq: 1, mode: "grab", detail_th: "Grab จากบ้าน → สยาม", price_min: 90, price_max: 120, minutes: 15, warning_th: null },
  ]},
];

const BUDGET_DEFAULTS: Record<Intent, number> = { work: 450, date: 900, family: 1200, photo: 600 };

export const W2_ZONES = ZONES;
export const W2_VENUES = VENUES;
export const W2_ROUTES = ROUTES;
export const W2_BUDGET_DEFAULTS = BUDGET_DEFAULTS;
