"use client";
// /app/plan/[id] — plan + trip + done ในหน้าเดียว
// โหมดหลักตาม plan.status (draft→plan | active→trip | done→summary)
// toggle ให้สลับ "ดู" ระหว่างแผน⇄เที่ยวได้จริงตอน active (ของเดิมกดแล้วไม่เกิดอะไร)
// T1.5: แตกเป็น PlanView/TripView/DoneView + plan-shared — เหลือแค่โหลด plan, usePlan,
// effectiveView, view toggle, suggestions sheet state และสลับ 3 view
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Confetti from "@/components/Confetti";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { gn } from "@/lib/api";
import { mid } from "@/lib/costing";
import { useApiResource } from "@/lib/use-api-resource";
import { usePlan } from "@/lib/use-plan";
import { useToast } from "@/lib/use-toast";
import type { ExpandedPlan } from "@/lib/server";
import type { Venue } from "@/lib/types";
import { DoneView } from "./done-view";
import { PlanView } from "./plan-view";
import { TripView } from "./trip-view";

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    data: plan,
    error: loadError,
    reload: load,
    setData: setPlan,
  } = useApiResource<ExpandedPlan>(`/api/plans/${id}`);
  const [view, setView] = useState<"plan" | "trip" | null>(null); // null = ตาม status
  const [suggestions, setSuggestions] = useState<{ list: Venue[]; indoor: boolean } | null>(null);
  const [celebrate, setCelebrate] = useState(false); // (1) confetti เฉพาะจังหวะกดจบทริปเอง

  const showToast = useToast();
  const { act, acting } = usePlan(plan, setPlan); // in-flight lock ต่อ action มาจาก hook กลาง (T1.4)

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
      {showPlan && <PlanView plan={plan} act={act} acting={acting} showToast={showToast} setView={setView} />}

      {/* ===== TRIP VIEW ===== */}
      {showTrip && (
        <TripView
          plan={plan}
          act={act}
          acting={acting}
          showToast={showToast}
          openChain={openChain}
          setCelebrate={setCelebrate}
        />
      )}

      {/* ===== DONE ===== */}
      {celebrate && <Confetti />}

      {isDone && <DoneView plan={plan} showToast={showToast} />}

      {/* ===== chain / replan bottom sheet ===== */}
      {suggestions && (
        <div
          className="gn-backdrop fixed inset-0 z-[29] bg-ink/20"
          onClick={() => setSuggestions(null)}
          aria-hidden
        />
      )}
      {suggestions && (
        <div role="dialog" aria-modal="true" aria-label="Replan suggestions" tabIndex={-1} ref={(el) => el?.focus()} onKeyDown={(e) => e.key === "Escape" && setSuggestions(null)} className="outline-none gn-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border border-b-0 border-line bg-card-solid p-5 shadow-2xl">
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
                    const p = await act("add_stop", { venue_id: v.id });
                    if (!p) return; // PATCH พัง — เงียบเหมือนเดิม (bottom sheet เปิดค้างเหมือนเดิม)
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
    </div>
  );
}
