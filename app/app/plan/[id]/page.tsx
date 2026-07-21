"use client";
// /app/plan/[id] — plan + trip + done ในหน้าเดียว
// โหมดหลักตาม plan.status (draft→plan | active→trip | done→summary)
// toggle ให้สลับ "ดู" ระหว่างแผน⇄เที่ยวได้จริงตอน active (ของเดิมกดแล้วไม่เกิดอะไร)
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import RouteLegs from "@/components/RouteLegs";
import TripRecap from "@/components/TripRecap";
import SplitPay from "@/components/SplitPay";
import { gn, track } from "@/lib/api";
import { fmtRange, mid } from "@/lib/costing";
import { useCountUp } from "@/lib/use-count-up";
import type { ExpandedPlan, ExpandedStop } from "@/lib/server";
import { MODE_LABELS, type Route, type Venue } from "@/lib/types";

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

// ambience ต่อ category — คงไว้เป็น visual เท่านั้น (ใช้แบบเดียวกับ explore/me)
const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
};

// สรุปเส้นทางจาก data จริง — แทน string hardcode เดิม (ถูกเฉพาะบางกะปิ)
function legsSummary(r: Route) {
  const modes = [...new Set(r.legs.map((l) => MODE_LABELS[l.mode]))].join("+");
  const min = r.legs.reduce((s, l) => s + l.price_min, 0);
  const max = r.legs.reduce((s, l) => s + l.price_max, 0);
  const mins = r.legs.reduce((s, l) => s + l.minutes, 0);
  return { modes, price: min === max ? `${min}฿` : `~${min}-${max}฿`, mins };
}

function mapsUrl(v: Venue) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name_th} สยาม กรุงเทพ`)}`;
}

function fmtTimeBKK(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// ปุ่มคู่ "ตามประเมิน / พิมพ์เอง" — ใช้ร่วมกันระหว่างการ์ดจุดปัจจุบัน + แถว timeline
function SpendPrompt({ estCost, onQuick, onCustom }: { estCost: number; onQuick: () => void; onCustom: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onQuick} className="gn-press o-pill-primary o-btn-label flex-1 py-2 text-sm">
        As estimated {estCost}฿
      </button>
      <button onClick={onCustom} className="gn-press o-pill-dark o-btn-label flex-1 py-2 text-sm">
        Type amount…
      </button>
    </div>
  );
}

// ช่องกรอกจำนวนเงินเอง — Enter to save (logic เดิม ย้ายมาใช้ร่วมกัน)
function SpendInput({ onSave, onClose }: { onSave: (amount: number) => void; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        autoFocus
        placeholder="฿"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = parseInt((e.target as HTMLInputElement).value, 10);
            if (n >= 0) onSave(n);
            onClose();
          }
          if (e.key === "Escape") onClose();
        }}
        className="w-28 rounded-full border border-line bg-bg px-3 py-2 text-sm text-ink"
      />
      <span className="text-xs text-mut">Enter to save</span>
      <button onClick={onClose} className="ml-auto text-xs text-mut underline">
        Cancel
      </button>
    </div>
  );
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<ExpandedPlan | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<"plan" | "trip" | null>(null); // null = ตาม status
  const [suggestions, setSuggestions] = useState<{ list: Venue[]; indoor: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [editingBudget, setEditingBudget] = useState(false);
  const [spendingSeq, setSpendingSeq] = useState<number | null>(null); // stop ที่กำลังพิมพ์จำนวนเงินเอง

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const load = useCallback(() => {
    setLoadError(false);
    gn<ExpandedPlan>(`/api/plans/${id}`)
      .then(setPlan)
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(load, [load]);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const p = await gn<ExpandedPlan>(`/api/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...extra }),
      });
      setPlan(p);
      return p;
    },
    [id],
  );

  const openChain = async (opts: { indoor?: boolean } = {}) => {
    const params = new URLSearchParams({ planId: plan!.id });
    if (opts.indoor) params.set("indoor", "1");
    try {
      const list = await gn<Venue[]>(`/api/chain?${params}`);
      setSuggestions({ list, indoor: !!opts.indoor });
    } catch {
      showToast("Couldn't load suggestions");
    }
  };

  // hooks ต้องมาก่อน early return ทุกตัว
  const spentAnim = useCountUp(plan?.spent ?? 0);
  const remainingAnim = useCountUp(plan ? Math.abs(plan.budget_planned - plan.spent) : 0);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🧭</p>
        <p className="mt-3 font-bold text-ink">Couldn't load this plan</p>
        <p className="mt-1 text-sm text-mut">It may have been deleted, or your connection dropped</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={load} className="gn-press gn-cta o-pill-primary o-btn-label px-6 py-2.5">
            Try again ↻
          </button>
          <button
            onClick={() => router.push("/app")}
            className="gn-press o-pill-dark o-btn-label px-6 py-2.5"
          >
            Back to planner
          </button>
        </div>
      </div>
    );
  }
  if (!plan) return <LoadingSkeleton lines={5} />;

  const isDone = plan.status === "done";
  // view จริงที่แสดง: done ล็อคเป็น summary · active เลือกดู plan/trip ได้ · draft ล็อคเป็น plan
  const effectiveView = isDone ? "done" : plan.status === "draft" ? "plan" : (view ?? "trip");
  const showPlan = effectiveView === "plan";
  const showTrip = effectiveView === "trip";
  const cheap = legsSummary(plan.route.kind === "cheapest" ? plan.route : plan.route_alt);
  const fast = legsSummary(plan.route.kind === "fastest" ? plan.route : plan.route_alt);
  // จุดปัจจุบัน = stop แรกที่ยังไม่จบ (เช็คอิน+จ่ายจริงครบทั้งคู่) — ไม่มี = ครบทุกจุดแล้ว (plan §4)
  const currentStopIndex = plan.stops.findIndex((s) => !(s.checked_in_at && s.actual_cost !== null));
  const currentStop: ExpandedStop | null = currentStopIndex >= 0 ? plan.stops[currentStopIndex] : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4">
      {/* ===== header ===== */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="o-serif text-[22px] font-medium text-ink">
            {isDone ? "Trip done ✓" : plan.status === "active" ? "On the trip" : "Your plan"}
          </h1>
          <p className="text-sm text-mut">{plan.origin_name} → Siam</p>
        </div>
        {plan.status === "active" && (
          <span className="o-mono inline-flex items-center gap-1.5 rounded-full border border-bad/40 bg-card-solid px-3 py-1 text-[10px] text-bad">
            <span className="gn-live-dot inline-block h-2 w-2 rounded-full bg-bad" />
            LIVE
          </span>
        )}
      </div>

      {/* ===== view toggle — ใช้ได้จริงเมื่อ active ===== */}
      {!isDone && (
        <div className="flex rounded-[11px] bg-bg-elev p-1">
          <button
            onClick={() => setView("plan")}
            className={`gn-press flex-1 rounded-lg py-2 text-[13px] font-bold ${
              showPlan ? "bg-pill text-bg" : "text-mut"
            }`}
          >
            🗓 Plan + route
          </button>
          <button
            onClick={() => {
              if (plan.status === "draft") {
                showToast("Hit 'Start the trip ▶' first to unlock this view");
                return;
              }
              setView("trip");
            }}
            className={`gn-press flex-1 rounded-lg py-2 text-[13px] font-bold ${
              showTrip ? "bg-pill text-bg" : "text-mut"
            } ${plan.status === "draft" ? "opacity-50" : ""}`}
          >
            🧭 On the trip
          </button>
        </div>
      )}

      {/* ===== PLAN VIEW ===== */}
      {showPlan && (
        <>
          <RouteLegs
            route={plan.route}
            alt={plan.route_alt}
            onToggle={() => {
              act("route_toggle");
              track("route_alt_toggle", { plan_id: plan.id, screen: "S3" });
            }}
          />

          <ol className="space-y-3">
            {plan.stops.map((s) => (
              <li key={s.seq} className="gn-card-e flex items-center gap-3 p-4">
                <span className="o-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card-solid text-[15px]">
                  {CATEGORY_EMOJI[s.venue.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{s.venue.name_th}</p>
                  <p className="text-xs text-mut">
                    ~{s.est_cost}฿/person · {s.venue.walk_min_from_hub} min walk from BTS Siam
                  </p>
                </div>
                <div className="gn-num whitespace-nowrap font-semibold text-ink">~{s.est_cost}฿</div>
              </li>
            ))}
          </ol>

          <BudgetBar est={plan.est_total} budget={plan.budget_planned} onEdit={() => setEditingBudget(true)} />

          {editingBudget && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card-solid p-3">
              <span className="text-sm font-semibold text-ink">New budget:</span>
              <input
                type="number"
                autoFocus
                defaultValue={plan.budget_planned}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt((e.target as HTMLInputElement).value, 10);
                    if (n > 0) {
                      act("budget_edit", { value: n });
                      track("budget_edit", { value: n, screen: "S3" });
                    }
                    setEditingBudget(false);
                  }
                  if (e.key === "Escape") setEditingBudget(false);
                }}
                className="w-24 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm text-ink"
              />
              <span className="text-xs text-mut">฿ · Enter to confirm</span>
              <button onClick={() => setEditingBudget(false)} className="ml-auto text-xs text-mut underline">
                Cancel
              </button>
            </div>
          )}

          {/* callout สลับเส้นทาง — ตัวเลขจาก data จริงของ origin นี้ */}
          {plan.route.kind === "cheapest" ? (
            <div className="rounded-[10px] border border-warn/40 bg-card-solid px-3 py-2 text-[12.5px] text-warn">
              🚗 Tired of transfers? {fast.modes} {fast.price} · {fast.mins} min
              <button
                onClick={() => {
                  act("route_toggle");
                  showToast("Route switched — total updates instantly");
                }}
                className="gn-press ml-1.5 rounded-lg border border-warn/50 bg-bg px-2.5 py-0.5 text-xs font-bold text-warn"
              >
                Switch to fastest
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-warn/40 bg-card-solid px-3 py-2 text-[12.5px] text-warn">
              🛵 Cheaper: {cheap.modes} {cheap.price} · {cheap.mins} min
              <button
                onClick={() => {
                  act("route_toggle");
                  showToast("Switched to the cheapest route");
                }}
                className="gn-press ml-1.5 rounded-lg border border-warn/50 bg-bg px-2.5 py-0.5 text-xs font-bold text-warn"
              >
                Switch to cheapest
              </button>
            </div>
          )}

          {plan.status === "draft" && (
            <button
              onClick={async () => {
                await act("start");
                track("plan_start_trip", { plan_id: plan.id });
                setView("trip");
                showToast("Trip mode on: check in and log real spending");
              }}
              className="gn-press gn-cta o-pill-primary o-btn-label w-full py-3.5 text-base"
            >
              Start the trip ▶
            </button>
          )}
        </>
      )}

      {/* ===== TRIP VIEW (live mode — ต้นแบบ Gonai live.html) — มือถือเป็นหลัก คอลัมน์เดียว ===== */}
      {showTrip && (
        <div className="mx-auto max-w-xl space-y-4">
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
                Spent {spentAnim}฿ / {plan.budget_planned}฿
              </span>
              <small className={`text-[13px] font-medium ${plan.spent > plan.budget_planned ? "text-bad" : "text-ok"}`}>
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
            <div key={w} className="rounded-xl border border-warn/40 bg-card-solid px-4 py-2.5 text-sm text-warn">
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
                        await act("checkin", { seq: currentStop.seq });
                        track("checkin", { seq: currentStop.seq, venue_id: currentStop.venue.id });
                      }}
                      className="gn-press o-pill-primary o-btn-label flex-1 py-2.5 text-sm"
                    >
                      Check in
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
                        estCost={currentStop.est_cost}
                        onQuick={async () => {
                          await act("spend", { seq: currentStop.seq, amount: currentStop.est_cost });
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
                    <span className="absolute left-[15px] top-[32px] bottom-0 w-px bg-line" />
                  )}
                  <span className="z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ok bg-ok text-[13px] text-bg">
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
                      <span className="absolute left-[15px] top-[32px] bottom-0 w-px bg-line" />
                    )}
                    <span
                      className={`z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                        doneStop
                          ? "border-ok bg-ok text-bg"
                          : isCurrent
                            ? "border-accent bg-card-solid text-ink shadow-[0_0_0_4px_rgba(207,230,245,0.12)]"
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
                                await act("checkin", { seq: s.seq });
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
                              estCost={s.est_cost}
                              onQuick={async () => {
                                await act("spend", { seq: s.seq, amount: s.est_cost });
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
              await act("done");
              track("plan_done", { plan_id: plan.id });
              showToast("Trip done 🎉 Help confirm prices for the next traveler");
            }}
            className="gn-press o-pill-primary o-btn-label w-full py-3.5 text-base"
          >
            End trip ✓
          </button>
        </div>
      )}

      {/* ===== DONE ===== */}
      {isDone && (
        <DoneSummary plan={plan} confirmed={confirmed} setConfirmed={setConfirmed} showToast={showToast} />
      )}

      {/* ===== chain / replan bottom sheet ===== */}
      {suggestions && (
        <div className="gn-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border border-b-0 border-line bg-card-solid p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">
              {suggestions.indoor ? `Indoor spots within budget (${plan.remaining}฿)` : `Next stop within budget`}
            </h2>
            <button onClick={() => setSuggestions(null)} className="text-sm text-mut">
              Close
            </button>
          </div>
          {suggestions.list.length === 0 && (
            <p className="text-sm text-mut">
              {(() => {
                const h = parseInt(
                  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(
                    new Date(),
                  ),
                  10,
                );
                return h >= 22 || h < 8
                  ? "Everything nearby is closed now — heading home is fine too"
                  : "Not enough budget left for nearby spots — heading home is fine too";
              })()}
            </p>
          )}
          <ul className="space-y-2">
            {suggestions.list.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elev p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{v.name_th}</p>
                  <p className="text-xs text-mut">~{mid(v.price_per_head_min, v.price_per_head_max)}฿/person</p>
                </div>
                <button
                  onClick={async () => {
                    await act("add_stop", { venue_id: v.id });
                    setSuggestions(null);
                    showToast(`Added ${v.name_th} to your plan`);
                  }}
                  className="gn-press o-pill-primary o-btn-label shrink-0 px-3 py-1.5 text-sm"
                >
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-card-solid px-5 py-2.5 text-[13px] text-ink">
          {toast}
        </div>
      )}
    </div>
  );
}

function DoneSummary({
  plan,
  confirmed,
  setConfirmed,
  showToast,
}: {
  plan: ExpandedPlan;
  confirmed: Set<string>;
  setConfirmed: (s: Set<string>) => void;
  showToast: (m: string) => void;
}) {
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
          {actualAnim}฿
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
    </div>
  );
}
