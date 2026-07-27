"use client";
// /app/plan/[id]/trip-view.tsx — โหมด "กำลังเที่ยว" (live, ต้นแบบ Gonai live.html) มือถือเป็นหลัก คอลัมน์เดียว
// ย้ายจาก page.tsx เดิม บล็อก showTrip (T1.5 แตกไฟล์) — logic/className/ข้อความเดิมทุกตัวอักษร ไม่มีแก้
import { useState, type Dispatch, type SetStateAction } from "react";
import Odo from "@/components/Odo";
import SplitPay from "@/components/SplitPay";
import { track } from "@/lib/api";
import { fmtRange } from "@/lib/costing";
import { useCountUp } from "@/lib/use-count-up";
import type { ExpandedPlan, ExpandedStop } from "@/lib/server";
import { CATEGORY_AMBIENCE, CATEGORY_EMOJI } from "@/lib/venue-display";
import { SpendInput, SpendPrompt, fmtTimeBKK, mapsUrl } from "./plan-shared";

interface TripViewProps {
  plan: ExpandedPlan;
  act: (action: string, payload?: Record<string, unknown>, key?: string) => Promise<ExpandedPlan | null>;
  acting: string | null;
  showToast: (msg: string) => void;
  openChain: (opts?: { indoor?: boolean }) => Promise<void>;
  setCelebrate: Dispatch<SetStateAction<boolean>>;
}

export function TripView({ plan, act, acting, showToast, openChain, setCelebrate }: TripViewProps) {
  const [spendingSeq, setSpendingSeq] = useState<number | null>(null);
  const [lastCheckin, setLastCheckin] = useState<number | null>(null); // (3) ripple จุดที่เพิ่งเช็คอิน // stop ที่กำลังพิมพ์จำนวนเงินเอง

  const spentAnim = useCountUp(plan?.spent ?? 0);
  const remainingAnim = useCountUp(plan ? Math.abs(plan.budget_planned - plan.spent) : 0);

  // จุดปัจจุบัน = stop แรกที่ยังไม่จบ (เช็คอิน+จ่ายจริงครบทั้งคู่) — ไม่มี = ครบทุกจุดแล้ว (plan §4)
  const currentStopIndex = plan.stops.findIndex((s) => !(s.checked_in_at && s.actual_cost !== null));
  const currentStop: ExpandedStop | null = currentStopIndex >= 0 ? plan.stops[currentStopIndex] : null;

  return (
    <div className="gn-slide-r mx-auto max-w-xl space-y-4">
      {/* sticky budget tracker — ตัวเลข/บาร์เดิมทุกตัว ย้ายขึ้นบนสุดให้เห็นตลอด */}
      <div className="sticky top-[57px] z-20 -mx-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-0 sm:rounded-2xl sm:border sm:bg-card-solid/70">
        <div className="flex items-center justify-between">
          <span className="o-mono inline-flex items-center gap-1.5 text-[10px] text-bad">
            <span className="gn-live-dot inline-block h-2 w-2 rounded-full bg-bad" />
            LIVE · on the trip
          </span>
          <span className="o-mono text-[10px] text-mut">{plan.origin_name} → Siam</span>
        </div>
        <div className="gn-num mt-1.5 flex items-baseline gap-2 text-[22px] font-bold text-ink">
          <span>
            Spent <Odo value={plan.spent} />฿ / {plan.budget_planned}฿
          </span>
          <small
            key={plan.spent}
            className={`gn-bump text-[13px] font-medium ${plan.spent > plan.budget_planned ? "text-bad" : "text-ok"}`}
          >
            · {plan.spent > plan.budget_planned ? `${remainingAnim}฿ over ⚠️` : `${remainingAnim}฿ left`}
          </small>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className={`gn-bar h-full rounded-full ${plan.spent > plan.budget_planned ? "bg-bad" : "bg-ok"}`}
            style={{ width: `${Math.min(100, (plan.spent / Math.max(1, plan.budget_planned)) * 100)}%` }}
          />
        </div>
      </div>

      {plan.warnings.map((w) => (
        <div key={w} className="gn-warn-banner px-4 py-2.5 text-sm text-warn">
          ⛴️ {w}
        </div>
      ))}

      {/* การ์ดจุดปัจจุบัน — ใหญ่สุดในจอ ทำ checkin/spend ตรงนี้ได้เลย */}
      {currentStop ? (
        <div className="gn-rise gn-card-e overflow-hidden">
          <div className={`o-grain relative flex h-[170px] flex-col justify-between p-4 ${CATEGORY_AMBIENCE[currentStop.venue.category]}`}>
            <span className="o-mono relative z-[2] self-start rounded-full bg-bg/60 px-3 py-1 text-[10px] text-accent backdrop-blur">
              {currentStop.checked_in_at ? "You are here" : "Next up"} · stop {currentStopIndex + 1}/{plan.stops.length}
            </span>
            <h2 className="o-serif relative z-[2] text-[24px] font-semibold text-ink drop-shadow">
              {currentStop.venue.name_th}
            </h2>
          </div>
          <div className="bg-card-solid p-4">
            <p className="mb-3.5 text-[13.5px] text-mut">
              {currentStop.checked_in_at
                ? `Checked in ${fmtTimeBKK(currentStop.checked_in_at)} · ${currentStop.venue.walk_min_from_hub} min walk from BTS Siam`
                : `${currentStop.venue.walk_min_from_hub} min walk from BTS Siam · open till ${currentStop.venue.close_time}`}
            </p>
            <div className="flex gap-2.5">
              <a
                href={mapsUrl(currentStop.venue)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("open_maps", { venue_id: currentStop.venue.id })}
                className="gn-press o-pill-dark o-btn-label flex-1 py-2.5 text-center text-sm"
              >
                🗺 Navigate
              </a>
              {!currentStop.checked_in_at && (
                <button
                  onClick={async () => {
                    const p = await act("checkin", { seq: currentStop.seq });
                    if (!p) return; // PATCH พัง — เงียบเหมือนเดิม
                    setLastCheckin(currentStop.seq);
                    track("checkin", { seq: currentStop.seq, venue_id: currentStop.venue.id });
                  }}
                  className="gn-press o-pill-primary o-btn-label flex-1 py-2.5 text-sm"
                 aria-busy={acting === "checkin"}>
                  {acting === "checkin" ? <><span className="gn-spinner" />…</> : "Check in"}
                </button>
              )}
            </div>

            {currentStop.checked_in_at && currentStop.actual_cost === null && (
              <div className="mt-3.5 border-t border-line pt-3.5">
                <p className="mb-2 text-sm font-medium text-ink">How much did you pay?</p>
                {spendingSeq === currentStop.seq ? (
                  <SpendInput
                    onSave={(n) => {
                      act("spend", { seq: currentStop.seq, amount: n });
                      track("spend_log", { seq: currentStop.seq, amount: n });
                    }}
                    onClose={() => setSpendingSeq(null)}
                  />
                ) : (
                  <SpendPrompt
                    busy={acting === "spend"}
                    estCost={currentStop.est_cost}
                    onQuick={async () => {
                      const p = await act("spend", { seq: currentStop.seq, amount: currentStop.est_cost });
                      if (!p) return; // PATCH พัง — เงียบเหมือนเดิม
                      track("spend_log", { seq: currentStop.seq, amount: currentStop.est_cost });
                    }}
                    onCustom={() => setSpendingSeq(currentStop.seq)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="gn-card-e p-5 text-center text-sm text-mut">
          All stops done 🎉 Hit &quot;End trip ✓&quot; below
        </div>
      )}

      {/* เส้นทางวันนี้ ทีละก้าว — ขาไป (นับเป็นจ่ายแล้วตั้งแต่เริ่มเที่ยว) + stops ตามลำดับจริง */}
      <div className="gn-rise gn-d1 gn-card-e p-4">
        <p className="o-mono mb-3 text-[10px] text-mut">Today's route · step by step</p>
        <div>
          {plan.route.legs.map((l, i) => (
            <div key={l.seq} className="relative flex gap-3.5 pb-4 last:pb-0">
              {(i < plan.route.legs.length - 1 || plan.stops.length > 0) && (
                <span className="gn-line-grow absolute left-[15px] top-[32px] bottom-0 w-px bg-line" />
              )}
              <span
                className="gn-pop z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ok bg-ok text-[13px] text-bg"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium text-ink">{l.detail_th}</p>
                <p className="text-xs text-mut">{l.minutes} min</p>
              </div>
              <span className="gn-num shrink-0 whitespace-nowrap text-[13px] text-ok">
                {fmtRange(l.price_min, l.price_max)}
              </span>
            </div>
          ))}

          {plan.stops.map((s, i) => {
            const doneStop = !!s.checked_in_at && s.actual_cost !== null;
            const isCurrent = i === currentStopIndex;
            return (
              <div key={s.seq} className="relative flex gap-3.5 pb-4 last:pb-0">
                {i < plan.stops.length - 1 && (
                  <span className="gn-line-grow absolute left-[15px] top-[32px] bottom-0 w-px bg-line" />
                )}
                <span
                  className={`z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                    doneStop
                      ? "border-ok bg-ok text-bg"
                      : isCurrent
                        ? `border-accent bg-card-solid text-ink shadow-[0_0_0_4px_rgba(30,127,79,0.18)]${lastCheckin === s.seq ? " gn-ripple-once" : ""}`
                        : "border-line bg-card-solid text-ink"
                  }`}
                >
                  {doneStop ? "✓" : CATEGORY_EMOJI[s.venue.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium text-ink">{s.venue.name_th}</p>
                  <p className="text-xs text-mut">
                    {doneStop
                      ? `Paid ${s.actual_cost}฿ ✓`
                      : isCurrent
                        ? currentStop?.checked_in_at
                          ? "You are here"
                          : "Current stop"
                        : s.checked_in_at
                          ? "Checked in · log spending"
                          : `${s.venue.walk_min_from_hub} min walk on · est ~${s.est_cost}฿`}
                  </p>

                  {/* จุดอื่นที่ไม่ใช่ปัจจุบัน — กดเพื่อเช็คอิน/กรอกจ่ายได้เหมือนเดิม (plan §4.4) */}
                  {!isCurrent && !doneStop && (
                    <div className="mt-1.5">
                      {!s.checked_in_at ? (
                        <button
                          onClick={async () => {
                            const p = await act("checkin", { seq: s.seq });
                            if (!p) return; // PATCH พัง — เงียบเหมือนเดิม
                            setLastCheckin(s.seq);
                            track("checkin", { seq: s.seq, venue_id: s.venue.id });
                          }}
                          className="gn-press o-mono rounded-full bg-pill px-3 py-1 text-[10px] text-bg"
                        >
                          Check in →
                        </button>
                      ) : spendingSeq === s.seq ? (
                        <SpendInput
                          onSave={(n) => {
                            act("spend", { seq: s.seq, amount: n });
                            track("spend_log", { seq: s.seq, amount: n });
                          }}
                          onClose={() => setSpendingSeq(null)}
                        />
                      ) : (
                        <SpendPrompt
                          busy={acting === "spend"}
                          estCost={s.est_cost}
                          onQuick={async () => {
                            const p = await act("spend", { seq: s.seq, amount: s.est_cost });
                            if (!p) return; // PATCH พัง — เงียบเหมือนเดิม
                            track("spend_log", { seq: s.seq, amount: s.est_cost });
                          }}
                          onCustom={() => setSpendingSeq(s.seq)}
                        />
                      )}
                    </div>
                  )}
                </div>
                <span className={`gn-num shrink-0 whitespace-nowrap text-[13px] ${doneStop ? "text-ok" : isCurrent ? "text-accent" : "text-mut"}`}>
                  {doneStop ? `${s.actual_cost}฿` : isCurrent ? "now" : "next"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <SplitPay base={plan.spent} />

      <button
        onClick={async () => {
          track("replan", { plan_id: plan.id });
          await openChain({ indoor: true });
        }}
        className="gn-press o-pill-dark o-btn-label w-full py-2.5 text-sm"
      >
        ☔ Raining / plan fell apart — replan within what's left
      </button>

      <button
        onClick={async () => {
          const done = await act("done");
          if (!done) return; // PATCH พัง — เงียบเหมือนเดิม (ก่อนหน้านี้ throw แล้วข้าม track+toast)
          setCelebrate(true);
          track("plan_done", { plan_id: plan.id });
          showToast("Trip done 🎉 Help confirm prices for the next traveler");
        }}
        className="gn-press o-pill-primary o-btn-label w-full py-3.5 text-base"
      >
        {acting === "done" ? <><span className="gn-spinner" />Ending…</> : "End trip ✓"}
      </button>
    </div>
  );
}
