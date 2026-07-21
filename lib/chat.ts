// Chat-to-plan — แปลงข้อความอิสระ (ไทย/อังกฤษ) เป็น action จริงของ planner
// หลักเดียวกับ audit เดิม: AI/parser มีสิทธิ์แค่ "ตั้งค่า" — ตัวเลขทุกตัวในคำตอบ
// ต้องมาจาก /api/venues ไม่ใช่จากโมเดล (client เป็นคนประกอบคำตอบ)
import type { VenueFilters } from "./filters";
import type { Intent } from "./types";

export interface ChatActions {
  intent?: Intent;
  origin?: string;
  budget?: number;
  // key ที่ระบุ = สั่งเปิด/ปิด filter นั้น · key ที่ไม่ระบุ = คงเดิม
  filters?: Partial<Record<keyof VenueFilters, boolean>>;
}

export interface ChatParse {
  actions: ChatActions;
  // ข้อความสั้นๆ จากตัวแปล (คำถามชี้แจง/หมายเหตุ) — ห้ามมีตัวเลขราคา
  note: string | null;
}

export interface ChatResponse extends ChatParse {
  source: "ai" | "quick";
}

// ---------- quick parser — fallback ตอนไม่มี Claude API key / เรียกไม่สำเร็จ ----------

const INTENT_WORDS: [Intent, RegExp][] = [
  ["date", /เดท|แฟน|\bdate\b|romantic/i],
  ["family", /ครอบครัว|ลูก|เด็ก|พ่อแม่|\bfamily\b|\bkids?\b/i],
  ["photo", /ถ่ายรูป|ถ่ายภาพ|กล้อง|\bphotos?\b|\bshoot\b|\bcamera\b/i],
  ["work", /ทำงาน|ประชุม|\bwork\b|\bmeeting\b|\bcall\b|โน้ตบุ๊ก|laptop/i],
];

// zone ต้นทาง — จับทั้ง id, ชื่ออังกฤษ (name_th ใน fixtures เป็นอังกฤษ) และชื่อไทย
const ZONE_WORDS: [string, RegExp][] = [
  ["bangkapi", /บางกะปิ|bang\s*kapi|bangkapi/i],
  ["ladprao", /ลาดพร้าว|lat\s*phrao|ladprao/i],
  ["onnut", /อ่อนนุช|on\s*nut|onnut/i],
  ["pinklao", /ปิ่นเกล้า|pin\s*klao|pinklao/i],
  ["chatuchak", /จตุจักร|chatuchak|จามจุรี/i],
  ["bangna", /บางนา|bang\s*na|bangna/i],
];

const FILTER_WORDS: [keyof VenueFilters, RegExp][] = [
  ["quiet", /เงียบ|\bquiet\b|\bcalls?-?friendly\b/i],
  ["plugs", /ปลั๊ก|\bplugs?\b|ชาร์จ|charge/i],
  ["indoor", /ในร่ม|ฝน|\bindoor\b|\brain\b/i],
  ["food", /กินข้าว|อาหาร|ร้านอาหาร|หิว|\bfood\b|\bmeals?\b|\beat\b/i],
  ["near", /ใกล้|เดินไม่ไกล|\bnear\b|\bclose\b|\bwalk\b/i],
];

export function parseQuick(message: string): ChatParse {
  const actions: ChatActions = {};

  for (const [intent, re] of INTENT_WORDS) {
    if (re.test(message)) {
      actions.intent = intent;
      break;
    }
  }
  for (const [zone, re] of ZONE_WORDS) {
    if (re.test(message)) {
      actions.origin = zone;
      break;
    }
  }

  // งบ: ต้องมีบริบทเรื่องเงินกำกับ ("500฿" / "500 บาท" / "งบ 500" / "มีเงิน 450")
  // — เลขโดดไม่มีบริบทไม่จับ กัน false positive แบบ "ปี 2026"
  const raw = message.match(/(\d{2,5})\s*(?:฿|บาท|baht)/i)?.[1] ?? message.match(/(?:budget|งบ|เงิน)\D{0,6}(\d{2,5})/i)?.[1];
  if (raw) {
    const n = Number(raw);
    if (n >= 100 && n <= 5000) actions.budget = n;
  }

  const filters: ChatActions["filters"] = {};
  for (const [key, re] of FILTER_WORDS) {
    if (re.test(message)) filters[key] = true;
  }
  if (Object.keys(filters).length > 0) actions.filters = filters;

  return { actions, note: null };
}
