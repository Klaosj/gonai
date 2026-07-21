"use client";
// BudgetBar — เขียวเมื่ออยู่ในงบ แดงเมื่อเกิน (spec S3)
// ตัวเลขวิ่ง + แถบไหลเข้าเป้า
import { useCountUp } from "@/lib/use-count-up";

export default function BudgetBar({ est, budget, onEdit }: { est: number; budget: number; onEdit?: () => void }) {
  const pct = Math.min(100, Math.round((est / Math.max(1, budget)) * 100));
  const over = est > budget;
  const estAnim = useCountUp(est);
  return (
    <div className="gn-card-e p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-ink">
        <span>
          Estimated{" "}
          <b className={`gn-num ${over ? "text-bad" : "text-ok"}`}>~{estAnim}฿</b> / budget{" "}
          <b className="gn-num">{budget}฿</b>
        </span>
        {onEdit && (
          <button onClick={onEdit} className="gn-press text-accent underline underline-offset-2">
            ✎ Edit budget
          </button>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`gn-bar h-full rounded-full ${over ? "bg-bad" : "bg-ok"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
