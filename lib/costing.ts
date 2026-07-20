// Journey costing — contract ตาม MVP Build Spec v1.0 ข้อ 2.6
import type { RouteLeg } from "./types";
import { MODE_LABELS } from "./types";

export const mid = (a: number, b: number) => Math.round((a + b) / 2);
export const ceil10 = (x: number) => Math.ceil(x / 10) * 10;
export const round5 = (x: number) => Math.round(x / 5) * 5;

export function routeCost(legs: RouteLeg[]) {
  return {
    min: legs.reduce((s, l) => s + l.price_min, 0),
    max: legs.reduce((s, l) => s + l.price_max, 0),
    minutes: legs.reduce((s, l) => s + l.minutes, 0),
  };
}

export function fmtRange(min: number, max: number) {
  return min === max ? `${min}฿` : `${min}–${max}฿`;
}

// บาทชิป: เฉพาะ leg ที่มีค่าใช้จ่าย เช่น "วิน 20฿ + เรือ 27฿ = 47฿"
export function bahtChipText(legs: RouteLeg[]) {
  const paid = legs.filter((l) => l.price_max > 0);
  const { min, max } = routeCost(legs);
  if (paid.length === 1) return `${MODE_LABELS[paid[0].mode]} ${fmtRange(paid[0].price_min, paid[0].price_max)}`;
  const parts = paid.map((l) => `${MODE_LABELS[l.mode]} ${fmtRange(l.price_min, l.price_max)}`);
  return `${parts.join(" + ")} = ${fmtRange(min, max)}`;
}

// งบประเมินทั้งวัน = (Σ ราคากลาง stop + Σ ราคากลางค่าเดินทาง) × 1.10 ปัดขึ้นหลักสิบ
export function dayBudgetEst(stopMids: number[], legMids: number[]) {
  const sum = stopMids.reduce((s, x) => s + x, 0) + legMids.reduce((s, x) => s + x, 0);
  return ceil10(sum * 1.1);
}

// Placeholder จนกว่าจะ validate ใน W2 (spec 2.6)
export function grabEstimate(km: number) {
  const f = 45 + 9.5 * km;
  return { min: round5(f * 0.85), max: round5(f * 1.25) };
}
