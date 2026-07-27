// StopTimelineList — timeline ของ stops ในแผน รวมจาก 2 ที่เดิม (T1.6):
// planner-client.tsx col3 (variant="interactive") + app/p/[id]/page.tsx หน้าแชร์ (variant="readonly")
// variant คุมทุกจุดที่เคย drift (leave-row style/emoji fallback/ขนาดฟอนต์/border ท้ายแถว) ให้พฤติกรรม
// เดิมของแต่ละที่คงเป๊ะ — ไม่มีการเปลี่ยนสี/ฟอนต์/spacing จริงที่ผู้ใช้เห็น ณ จุดใดจุดหนึ่ง
import { buildTimeline } from "@/lib/timeline";
import type { ExpandedPlan } from "@/lib/server";
import { CATEGORY_EMOJI } from "@/lib/venue-display";

interface StopTimelineListProps {
  plan: ExpandedPlan;
  variant: "interactive" | "readonly";
}

export function StopTimelineList({ plan, variant }: StopTimelineListProps) {
  const tl = buildTimeline(plan.stops, plan.route);
  const interactive = variant === "interactive";
  // routeFare เฉพาะ readonly (หน้าแชร์เดิมโชว์ค่าโดยสาร ไม่ใช่ route_kind แบบ interactive)
  const routeFare = plan.route.legs.reduce((s, l) => s + l.price_min, 0);

  return (
    <div className={interactive ? "flex flex-col" : "mt-3 flex flex-col"}>
      {interactive && tl && (
        <div className="flex gap-2.5 border-b border-dashed border-line py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card-solid text-[13px]">
            🏠
          </div>
          <div className="min-w-0 flex-1">
            <b className="text-[13.5px] text-ink">
              Leave {plan.origin_name} ~{tl.leaveOrigin}
            </b>
            <small className="block leading-relaxed text-mut">
              {tl.transitMin} min to the first stop ({plan.route_kind} route)
            </small>
          </div>
        </div>
      )}
      {!interactive && tl && (
        <p className="mt-1.5 text-[13px] text-mut">
          Leave {plan.origin_name} ~<b className="text-ink">{tl.leaveOrigin}</b> · {tl.transitMin} min to the first
          stop · {routeFare}฿ transport
        </p>
      )}
      {plan.stops.map((s, i) => (
        <div key={s.seq}>
          {tl?.stops[i]?.walkFromPrev != null && (
            <p className={`o-mono py-1 pl-9 text-mut ${interactive ? "text-[9.5px]" : "text-[10px]"}`}>
              ≤ {tl.stops[i].walkFromPrev} min walk
            </p>
          )}
          <div className={`flex gap-2.5 border-b border-dashed border-line py-2.5${interactive ? "" : " last:border-b-0"}`}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card-solid text-[13px]">
              {interactive ? CATEGORY_EMOJI[s.venue.category] : (CATEGORY_EMOJI[s.venue.category] ?? "📍")}
            </div>
            <div className="min-w-0 flex-1">
              <b className={`text-[13.5px]${interactive ? " text-ink" : ""}`}>{s.venue.name_th}</b>
              <small className="block leading-relaxed text-mut">
                {tl && (
                  <>
                    ~{tl.stops[i].start}–{tl.stops[i].end} ·{" "}
                  </>
                )}
                {s.venue.walk_min_from_hub} min from BTS Siam
              </small>
            </div>
            <div className={`gn-num whitespace-nowrap font-semibold${interactive ? " text-ink" : ""}`}>
              ~{s.est_cost}฿
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
