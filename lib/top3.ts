// Top 3 = 2 Hit + 1 Unseen — contract ตาม MVP Build Spec v1.0 ข้อ 2.6
import type { Intent, Venue } from "./types";

const byRank = (rank: (v: Venue) => number | null) => (a: Venue, b: Venue) => {
  const ra = rank(a) ?? Infinity;
  const rb = rank(b) ?? Infinity;
  if (ra !== rb) return ra - rb;
  return a.walk_min_from_hub - b.walk_min_from_hub;
};

export interface Top3Result {
  cards: Venue[];
  more: Venue[];
  total: number;
  unseenPoolEmpty: boolean;
}

export function top3(venues: Venue[], intent: Intent): Top3Result {
  const pool = venues.filter((v) => v.intents.includes(intent));
  const hits = pool.filter((v) => v.badge === "hit").sort(byRank((v) => v.hit_rank));
  const unseen = pool
    .filter((v) => v.badge === "unseen" && v.validation_count >= 3)
    .sort(byRank((v) => v.unseen_rank));

  const cards: Venue[] = [];
  if (hits[0]) cards.push(hits[0]);
  if (hits[1]) cards.push(hits[1]);
  const unseenPoolEmpty = unseen.length === 0;
  if (unseen[0]) cards.push(unseen[0]);
  else if (hits[2]) cards.push(hits[2]); // fallback + log event 'unseen_pool_empty'

  // ดูเพิ่ม: ใบถัดไปสูงสุด 4 ใบ สลับ hit/unseen
  const usedIds = new Set(cards.map((v) => v.id));
  const restHits = hits.filter((v) => !usedIds.has(v.id));
  const restUnseen = unseen.filter((v) => !usedIds.has(v.id));
  const more: Venue[] = [];
  let i = 0;
  while (more.length < 4 && (restHits[i] || restUnseen[i])) {
    if (restHits[i]) more.push(restHits[i]);
    if (restUnseen[i] && more.length < 4) more.push(restUnseen[i]);
    i++;
  }

  return { cards, more, total: pool.length, unseenPoolEmpty };
}
