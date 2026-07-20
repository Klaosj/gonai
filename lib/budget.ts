// Budget default — contract ตาม MVP Build Spec v1.0 ข้อ 2.6
// มีประวัติ done ≥ 3 → median(budget_actual) ปัดเป็นหลัก 50 · ไม่งั้นใช้ตาราง
import { BUDGET_DEFAULTS } from "./fixtures";
import type { Intent, Plan } from "./types";

const round50 = (x: number) => Math.round(x / 50) * 50;

export function budgetDefault(intent: Intent, donePlans: Plan[]): number {
  const actuals = donePlans
    .map((p) => p.budget_actual)
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => a - b);
  if (actuals.length >= 3) {
    const m = Math.floor(actuals.length / 2);
    const median = actuals.length % 2 ? actuals[m] : (actuals[m - 1] + actuals[m]) / 2;
    return round50(median);
  }
  return BUDGET_DEFAULTS[intent];
}
