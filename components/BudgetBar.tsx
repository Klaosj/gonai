// BudgetBar — เขียวเมื่ออยู่ในงบ แดงเมื่อเกิน (spec S3, mockup ⑤)
export default function BudgetBar({ est, budget, onEdit }: { est: number; budget: number; onEdit?: () => void }) {
  const pct = Math.min(100, Math.round((est / Math.max(1, budget)) * 100));
  const over = est > budget;
  return (
    <div className="rounded-2xl bg-gn-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>
          งบประเมิน <b className={over ? "text-gn-red" : "text-gn-green"}>~{est}฿</b> / งบตั้งไว้ <b>{budget}฿</b>
        </span>
        {onEdit && (
          <button onClick={onEdit} className="text-gn-orange underline underline-offset-2">
            ✎ แก้งบ
          </button>
        )}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gn-cream">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-gn-red" : "bg-gn-green"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
