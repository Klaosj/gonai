"use client";
// /app/plan/[id]/done-view.tsx — สรุปทริปหลังกด "End trip ✓" (status done)
// ย้ายจาก page.tsx เดิม function DoneSummary (T1.5 แตกไฟล์) — logic/className/ข้อความเดิมทุกตัวอักษร ไม่มีแก้
// confirmed/setConfirmed เดิมเป็น state ระดับ page ส่งมาเป็น prop — ผู้ใช้จริงมีแค่ DoneView หน้าเดียว
// จึงย้ายเป็น local state ในนี้ตรงตามกติกา "state ใช้แค่ view เดียว ย้ายเป็น local ได้"
import { useState } from "react";
import Link from "next/link";
import Odo from "@/components/Odo";
import SplitPay from "@/components/SplitPay";
import TripRecap from "@/components/TripRecap";
import { track } from "@/lib/api";
import { mid } from "@/lib/costing";
import { useCountUp } from "@/lib/use-count-up";
import type { ExpandedPlan } from "@/lib/server";
import { CATEGORY_EMOJI } from "@/lib/venue-display";

interface DoneViewProps {
  plan: ExpandedPlan;
  showToast: (m: string) => void;
}

export function DoneView({ plan, showToast }: DoneViewProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const toConfirm = plan.stops.filter((s) => s.actual_cost !== null).slice(0, 2);
  const over = (plan.budget_actual ?? 0) > plan.budget_planned;
  const diff = (plan.budget_actual ?? 0) - plan.budget_planned;
  const actualAnim = useCountUp(plan.budget_actual ?? 0, 900);

  return (
    <div className="space-y-4">
      {/* สรุปทริป */}
      <div className="gn-card-e gn-rise p-5">
        <p className="o-mono text-[10px] text-mut">Actually spent today</p>
        <p className={`o-serif gn-num text-[64px] font-medium leading-tight ${over ? "text-bad" : "text-ink"}`}>
          <Odo value={plan.budget_actual ?? 0} />฿
        </p>
        <p className="text-sm text-mut">
          Budget {plan.budget_planned}฿ · estimated ~{plan.est_total}฿ ·{" "}
          {diff > 0 ? `${diff}฿ over budget` : diff === 0 ? "Exactly on budget" : `${-diff}฿ under budget ✓`}
        </p>
        <div className="mt-3 space-y-1 divide-y divide-line border-t border-line pt-3 text-sm text-ink">
          {plan.stops.map((s) => (
            <div key={s.seq} className="flex justify-between py-1 first:pt-0">
              <span className="truncate">{CATEGORY_EMOJI[s.venue.category]} {s.venue.name_th}</span>
              <b className="gn-num ml-2 shrink-0">{s.actual_cost ?? s.est_cost}฿</b>
            </div>
          ))}
        </div>

        <SplitPay base={plan.spent} />
      </div>

      {/* แชร์ recap — ปิดวง sharing */}
      <TripRecap plan={plan} onShared={showToast} />

      {/* confirm ราคา — copy ตรงกับสิ่งที่เกิดจริง: ส่งเข้าคิว validate ของทีม */}
      {toConfirm.filter((s) => !confirmed.has(s.venue.id)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-ink">Help confirm prices for the next traveler 🙏</h2>
          {toConfirm
            .filter((s) => !confirmed.has(s.venue.id))
            .map((s) => (
              <div key={s.venue.id} className="gn-card-e p-4">
                <p className="mb-2 text-sm text-ink">
                  Is <b>{s.venue.name_th}</b> still ~{mid(s.venue.price_per_head_min, s.venue.price_per_head_max)}
                  ฿/person?
                </p>
                {editingPrice === s.venue.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      autoFocus
                      placeholder="฿/person"
                      aria-label="Price per person in baht"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const n = parseInt((e.target as HTMLInputElement).value, 10);
                          if (n > 0) {
                            track("price_confirm", { venue_id: s.venue.id, ok: false, new_price: n });
                            setConfirmed(new Set(confirmed).add(s.venue.id));
                            showToast("New price sent to the validation queue — thanks!");
                          }
                          setEditingPrice(null);
                        }
                        if (e.key === "Escape") setEditingPrice(null);
                      }}
                      className="w-28 rounded-full border border-line bg-bg px-3 py-2 text-sm text-ink"
                    />
                    <span className="text-xs text-mut">Enter to send</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        track("price_confirm", { venue_id: s.venue.id, ok: true, new_price: null });
                        setConfirmed(new Set(confirmed).add(s.venue.id));
                        showToast("Thanks! This makes the next traveler's budget sharper");
                      }}
                      className="gn-press o-pill-primary o-btn-label flex-1 py-2 text-sm"
                    >
                      Yes ✓
                    </button>
                    <button
                      onClick={() => setEditingPrice(s.venue.id)}
                      className="gn-press o-pill-dark o-btn-label flex-1 py-2 text-sm"
                    >
                      Change to…
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="rounded-[10px] border border-line bg-card-solid px-3 py-2.5 text-[12.5px] text-accent">
        💚 Every confirmation goes to the validation queue — spots earn a &quot;price checked&quot; badge at 3 confirmations
      </div>

      {/* Task 2.6: CTA ปิดวง — ชวนวางแผนวันถัดไปทันทีตอนที่ยังอินอยู่ */}
      <Link href="/app" className="gn-press o-pill-primary o-btn-label mt-4 inline-block px-6 py-3 text-sm">
        Plan another day →
      </Link>
    </div>
  );
}
