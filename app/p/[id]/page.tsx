// หน้าแชร์แผนแบบ view-only — เปิดได้ด้วยลิงก์ที่มี token เท่านั้น (ไม่ต้อง login)
// ไม่โชว์ข้อมูลเจ้าของ · ตัวเลขทุกตัวมาจาก expandPlan เดียวกับในแอป
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import { expandPlan } from "@/lib/server";
import { verifyShareToken } from "@/lib/share";
import { store } from "@/lib/store";
import { buildTimeline, tripTitle } from "@/lib/timeline";

export const metadata: Metadata = {
  title: "Trip plan — GoNai",
  description: "A day plan with every baht counted — made with GoNai",
};

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

export default async function SharedPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { id } = await params;
  const { k } = await searchParams;
  if (!verifyShareToken(id, k)) notFound();

  const raw = await store.getPlan(id);
  if (!raw) notFound();
  const plan = await expandPlan(raw);
  const tl = buildTimeline(plan.stops, plan.route);
  const title = tripTitle(plan.intent, plan.origin_name, plan.budget_planned);
  const routeFare = plan.route.legs.reduce((s, l) => s + l.price_min, 0);

  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-ink">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Logo className="text-[24px]" />
        </div>

        <div className="gn-card-e p-5">
          <p className="o-mono text-[10px] text-mut">SHARED PLAN · VIEW ONLY</p>
          <h1 className="o-serif mt-1 text-[22px] font-semibold leading-snug">{title}</h1>

          {tl && (
            <p className="mt-1.5 text-[13px] text-mut">
              Leave {plan.origin_name} ~<b className="text-ink">{tl.leaveOrigin}</b> · {tl.transitMin} min to the first
              stop · {routeFare}฿ transport
            </p>
          )}

          <div className="mt-3 flex flex-col">
            {plan.stops.map((s, i) => (
              <div key={s.seq}>
                {tl?.stops[i]?.walkFromPrev != null && (
                  <p className="o-mono py-1 pl-9 text-[10px] text-mut">≤ {tl.stops[i].walkFromPrev} min walk</p>
                )}
                <div className="flex gap-2.5 border-b border-dashed border-line py-2.5 last:border-b-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card-solid text-[13px]">
                    {CATEGORY_EMOJI[s.venue.category] ?? "📍"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="text-[13.5px]">{s.venue.name_th}</b>
                    <small className="block leading-relaxed text-mut">
                      {tl && (
                        <>
                          ~{tl.stops[i].start}–{tl.stops[i].end} ·{" "}
                        </>
                      )}
                      {s.venue.walk_min_from_hub} min from BTS Siam
                    </small>
                  </div>
                  <div className="gn-num whitespace-nowrap font-semibold">~{s.est_cost}฿</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-baseline justify-between rounded-xl border border-line bg-card-solid/60 px-3 py-2.5">
            <span className="o-mono text-[10px] text-mut">EST. TOTAL INCL. TRANSPORT</span>
            <span className="gn-num text-[22px] font-semibold">
              ~{plan.est_total}฿ <span className="text-[12px] font-normal text-mut">/ {plan.budget_planned}฿ budget</span>
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="gn-press gn-cta o-pill-primary o-btn-label inline-block px-7 py-3 text-sm">
            Plan yours free — every baht counted ▶
          </Link>
          <p className="o-mono-text mt-3 text-[10.5px] text-mut">
            Times with ~ are estimates · transport & walk minutes are field-collected
          </p>
        </div>
      </div>
    </div>
  );
}
