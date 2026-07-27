// plan-rules.ts — กติกา plan ล้วนๆ ทดสอบได้ไม่ต้องมี store (Task 2.3)
import type { Plan } from "./types";

// หา active plan "ตัวอื่น" ของ user ที่ไม่ใช่ targetId — ใช้กันไม่ให้ start ทริปซ้อน
// (target ตัวเองเป็น active ก็ไม่นับว่าบล็อกตัวเอง)
export function findBlockingActive(plans: Plan[], targetId: string): Plan | null {
  return plans.find((p) => p.status === "active" && p.id !== targetId) ?? null;
}
