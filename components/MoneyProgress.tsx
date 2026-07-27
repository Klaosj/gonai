"use client";
// MoneyProgress — เดิมมีการ์ดงบเดี่ยว ("Estimated ~X / budget Y" + แถบ) กับกล่องงบ inline ใน
// planner-client.tsx (Spent ด้วย Odo + บรรทัด left/over + แถบ 3 สี + แก้งบแบบ inline + est-warning เฉพาะ draft)
// เป็นคนละ widget กันจริง (odo vs count-up, สี 2 ระดับ vs 3 ระดับ, edit แบบ delegate-ให้ parent วาด vs
// inline-ในตำแหน่งเดิม, มี/ไม่มี draft-warning block) — ถ้ายัดรวมเป็นก้อนเดียวต้องมี switch ~5 ตัว
// = abstraction ที่แย่กว่า duplication เดิม จึง**ไม่รวมทั้งกล่อง**
// ของที่ซ้ำจริงมีจุดเดียว: track+fill ของแถบ (เหมือนกันเกือบทุกตัวอักษร ต่างแค่ w-full/mt-2.5 + จำนวนระดับสี)
// → แชร์แค่ MoneyProgressBar ตัวนั้น ส่วน MoneyProgress (default) คือการ์ดงบเดี่ยวเดิม generalize label/value/target
import { useCountUp } from "@/lib/use-count-up";

// track+fill ที่ใช้ร่วมกัน — ผู้เรียกคำนวณ tone เอง เพื่อให้ตรรกะสีของแต่ละที่คงเดิมเป๊ะ (ไม่มี prop warnAt)
export function MoneyProgressBar({
  pct,
  tone,
  className = "",
}: {
  pct: number;
  tone: "ok" | "warn" | "bad";
  className?: string;
}) {
  const toneClass = tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : "bg-ok";
  return (
    <div className={`h-1 overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`gn-bar h-full rounded-full ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// การ์ดงบเดี่ยวเดิม generalize: est→value, budget→target, เพิ่ม label (plan-view ส่ง "Estimated" แล้วประโยค
// ออกมาเหมือนเดิมทุกตัวอักษร) — เขียวเมื่ออยู่ในงบ แดงเมื่อเกิน (spec S3), ตัวเลขวิ่ง + แถบไหลเข้าเป้า
export default function MoneyProgress({
  label,
  value,
  target,
  onEdit,
}: {
  label: string;
  value: number;
  target: number;
  onEdit?: () => void;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  const over = value > target;
  const valueAnim = useCountUp(value);
  return (
    <div className="gn-card-e p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-ink">
        <span>
          {label}{" "}
          <b className={`gn-num ${over ? "text-bad" : "text-ok"}`}>~{valueAnim}฿</b> / budget{" "}
          <b className="gn-num">{target}฿</b>
        </span>
        {onEdit && (
          <button onClick={onEdit} className="gn-press text-accent underline underline-offset-2">
            ✎ Edit budget
          </button>
        )}
      </div>
      <MoneyProgressBar pct={pct} tone={over ? "bad" : "ok"} className="w-full" />
    </div>
  );
}
