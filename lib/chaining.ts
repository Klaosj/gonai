// Chaining "ไปไหนต่อ" + Replan แผนพัง — contract ตาม MVP Build Spec v1.0 ข้อ 2.6
import { mid } from "./costing";
import type { Venue } from "./types";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export interface ChainOptions {
  zoneId: string;
  timeHHMM: string; // เวลาปัจจุบัน
  remainingBudget: number;
  indoorOnly?: boolean; // replan ฝนตก/แผนพัง
  excludeIds?: string[];
}

export function chainSuggestions(venues: Venue[], opts: ChainOptions): Venue[] {
  const arriveAt = toMinutes(opts.timeHHMM) + 30; // เผื่อเดินทาง 30 นาที
  const exclude = new Set(opts.excludeIds ?? []);

  const candidates = venues.filter((v) => {
    if (v.zone_id !== opts.zoneId || exclude.has(v.id)) return false;
    if (opts.indoorOnly && !v.attributes.indoor) return false;
    const open = toMinutes(v.open_time);
    const close = toMinutes(v.close_time);
    if (arriveAt < open || arriveAt >= close) return false;
    const transitMid = 0; // โซนเดียวกัน = เดิน
    return mid(v.price_per_head_min, v.price_per_head_max) + transitMid <= opts.remainingBudget;
  });

  // transition_rank ASC · null ไปท้าย เรียงตาม walk_min
  candidates.sort((a, b) => {
    const ra = a.transition_rank ?? Infinity;
    const rb = b.transition_rank ?? Infinity;
    if (ra !== rb) return ra - rb;
    return a.walk_min_from_hub - b.walk_min_from_hub;
  });

  return candidates.slice(0, 3);
}
