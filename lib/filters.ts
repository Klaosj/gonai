// ตัวกรองเงื่อนไขจริง — มาแทน quick-reply ปลอมที่กดแล้วได้แค่ toast
// ทุกตัวกรองผูกกับ attribute จริงใน data model (spec 2.5)
import type { Venue } from "./types";

export interface VenueFilters {
  near?: boolean; // เดินจาก hub ≤ 10 นาที
  food?: boolean; // มีอาหารจริงจัง (food_level = meals)
  quiet?: boolean; // เงียบพอประชุม/ทำงาน (noise = quiet)
  plugs?: boolean; // มีปลั๊ก (plugs ≠ none)
  indoor?: boolean; // ในร่ม (ฝนตกไม่เปียก)
}

export const FILTER_KEYS = ["near", "food", "quiet", "plugs", "indoor"] as const;

export function applyVenueFilters(venues: Venue[], f: VenueFilters): Venue[] {
  return venues.filter(
    (v) =>
      (!f.near || v.walk_min_from_hub <= 10) &&
      (!f.food || v.attributes.food_level === "meals") &&
      (!f.quiet || v.attributes.noise === "quiet") &&
      (!f.plugs || v.attributes.plugs !== "none") &&
      (!f.indoor || v.attributes.indoor),
  );
}

export function parseFilters(sp: URLSearchParams): VenueFilters {
  const f: VenueFilters = {};
  for (const k of FILTER_KEYS) if (sp.get(k) === "1") f[k] = true;
  return f;
}

export function filtersToParams(f: VenueFilters): string {
  return FILTER_KEYS.filter((k) => f[k])
    .map((k) => `&${k}=1`)
    .join("");
}
