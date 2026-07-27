"use client";
// /app/plan/[id]/plan-view.tsx — โหมด "ดูแผน + เส้นทาง" (status draft/active มุมมอง plan)
// ย้ายจาก page.tsx เดิม บล็อก showPlan (T1.5 แตกไฟล์) — logic/className/ข้อความเดิมทุกตัวอักษร ไม่มีแก้
import { useState, type Dispatch, type SetStateAction } from "react";
import MoneyProgress from "@/components/MoneyProgress";
import RouteLegs from "@/components/RouteLegs";
import { track } from "@/lib/api";
import type { ExpandedPlan } from "@/lib/server";
import { CATEGORY_EMOJI } from "@/lib/venue-display";
import { legsSummary } from "./plan-shared";

interface PlanViewProps {
  plan: ExpandedPlan;
  act: (action: string, payload?: Record<string, unknown>, key?: string) => Promise<ExpandedPlan | null>;
  acting: string | null;
  showToast: (msg: string) => void;
  setView: Dispatch<SetStateAction<"plan" | "trip" | null>>;
}

export function PlanView({ plan, act, acting, showToast, setView }: PlanViewProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const cheap = legsSummary(plan.route.kind === "cheapest" ? plan.route : plan.route_alt);
  const fast = legsSummary(plan.route.kind === "fastest" ? plan.route : plan.route_alt);

  return (
    <div className="gn-slide-l mx-auto max-w-2xl space-y-4">
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

      <MoneyProgress label="Estimated" value={plan.est_total} target={plan.budget_planned} onEdit={() => setEditingBudget(true)} />

      {editingBudget && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card-solid p-3">
          <span className="text-sm font-semibold text-ink">New budget:</span>
          <input
            type="number"
            autoFocus
            defaultValue={plan.budget_planned}
            aria-label="New budget in baht"
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
        <div className="gn-warn-banner px-3 py-2 text-[12.5px] text-warn">
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
        <div className="gn-warn-banner px-3 py-2 text-[12.5px] text-warn">
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
            const p = await act("start");
            if (!p) return; // PATCH พัง — เงียบเหมือนเดิม (ก่อนหน้านี้ throw แล้วข้ามท่อนล่าง)
            track("plan_start_trip", { plan_id: plan.id });
            setView("trip");
            showToast("Trip mode on: check in and log real spending");
          }}
          className="gn-press gn-cta o-pill-primary o-btn-label w-full py-3.5 text-base"
        >
          {acting === "start" ? <><span className="gn-spinner" />Starting…</> : "Start the trip ▶"}
        </button>
      )}
    </div>
  );
}
