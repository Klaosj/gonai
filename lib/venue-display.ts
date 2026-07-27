// แผนผังการแสดงผลราย category/intent (ที่เดียวทั้งแอป) — รวมจาก 6+ สำเนาที่ copy กระจายอยู่
import type { Intent, Venue } from "./types";

export const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

export const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
};

// ambience ต่อ intent — ใช้กับ hero กลาง (plan §2/§3.3) และหน้า me
export const INTENT_AMBIENCE: Record<Intent, string> = {
  work: "o-ambience-work",
  date: "o-ambience-date",
  family: "o-ambience-family",
  photo: "o-ambience-photo",
};

// ค่ามาจากสำเนา live 2 ตัวที่ตรงกัน (explore + me) — date: 💛
// components/IntentChips.tsx เคยมี date: 💐 (สำเนา drift) แต่ไฟล์นั้นถูกลบไปแล้วใน T1.8 (fe1.8) จึงไม่มีจุดขัดแย้งให้ชั่งน้ำหนักอีกต่อไป
export const INTENT_EMOJI: Record<Intent, string> = {
  work: "💻",
  date: "💛",
  family: "👨‍👩‍👧",
  photo: "📷",
};
