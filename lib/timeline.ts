// Timeline ของแผน — เวลาเดินทางมาจากตัวเลขจริงทั้งหมด (route legs + walk_min_from_hub
// ที่เก็บภาคสนาม) · ส่วน "เวลาอยู่ต่อร้าน" เป็นค่าตั้งต้นต่อ category ติดป้าย ~ ชัดๆ
import type { Intent, Route, Venue } from "./types";

export const STAY_MIN: Record<Venue["category"], number> = {
  cafe: 90,
  restaurant: 75,
  activity: 120,
  market: 60,
};

export interface TimelineStop {
  start: string; // "10:00"
  end: string;
  // นาทีเดินจากจุดก่อนหน้า — เพดานจริง (ระยะวัดจริงสองท่อนผ่าน hub) จึงแสดงเป็น ≤
  walkFromPrev: number | null;
}

export interface Timeline {
  leaveOrigin: string; // เวลาออกจากต้นทางเพื่อถึงร้านแรกพอดี
  transitMin: number; // นาที legs จริง + เดินจาก hub ถึงร้านแรก
  stops: TimelineStop[];
  endTime: string;
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number): string =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function buildTimeline(
  stops: { venue: Pick<Venue, "category" | "open_time" | "walk_min_from_hub"> }[],
  route: Pick<Route, "legs">,
  startHHMM = "10:00",
): Timeline | null {
  if (stops.length === 0) return null;
  const legsMin = route.legs.reduce((s, l) => s + l.minutes, 0);
  const transitMin = legsMin + stops[0].venue.walk_min_from_hub;

  // เริ่มที่ startHHMM หรือเวลาเปิดของร้านแรก แล้วแต่อะไรช้ากว่า
  let cursor = Math.max(toMin(startHHMM), toMin(stops[0].venue.open_time));
  const out: TimelineStop[] = [];
  let prev: (typeof stops)[number] | null = null;

  for (const s of stops) {
    let walkFromPrev: number | null = null;
    if (prev) {
      walkFromPrev = prev.venue.walk_min_from_hub + s.venue.walk_min_from_hub;
      cursor += walkFromPrev;
    }
    cursor = Math.max(cursor, toMin(s.venue.open_time)); // ร้านยังไม่เปิด = รอเวลาเปิด
    const start = cursor;
    cursor += STAY_MIN[s.venue.category];
    out.push({ start: toHHMM(start), end: toHHMM(cursor), walkFromPrev });
    prev = s;
  }

  return {
    leaveOrigin: toHHMM(toMin(out[0].start) - transitMin),
    transitMin,
    stops: out,
    endTime: out[out.length - 1].end,
  };
}

// ชื่อทริปอัตโนมัติ — ประกอบจากข้อมูลจริงของแผนเท่านั้น
const INTENT_TITLE: Record<Intent, string> = {
  work: "💻 Work session",
  date: "💛 Date day",
  family: "👨‍👩‍👧 Family day",
  photo: "📷 Photo walk",
};

export function tripTitle(intent: Intent, originName: string, budget: number): string {
  return `${INTENT_TITLE[intent]} from ${originName} · ${budget}฿`;
}
