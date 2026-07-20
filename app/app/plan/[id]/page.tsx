"use client";
// /app/plan/[id] — รวม plan + trip ในหน้าเดียว (mockup toggle plan⇄trip)
// ใช้ plan.status เป็น implicit mode: draft→plan | active→trip | done→summary+price-confirm
// อ้างอิง painai-app-v3.html (1 page, 2 mode toggle)
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import RouteLegs from "@/components/RouteLegs";
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { ExpandedPlan } from "@/lib/server";
import type { Venue } from "@/lib/types";

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<ExpandedPlan | null>(null);
  const [suggestions, setSuggestions] = useState<{ list: Venue[]; indoor: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  // update clock every 30s สำหรับ live indicator
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    gn<ExpandedPlan>(`/api/plans/${id}`).then(setPlan).catch(() => {});
  }, [id]);

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
    const list = await gn<Venue[]>(`/api/chain?${params}`);
    setSuggestions({ list, indoor: !!opts.indoor });
  };

  if (!plan) return <LoadingSkeleton lines={5} />;

  const isPlan = plan.status === "draft";
  const isTrip = plan.status === "active";
  const isDone = plan.status === "done";

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4">
      {/* ===== header + mode toggle ===== */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="gn-serif text-[22px] font-extrabold">
            {isDone ? "จบทริป ✓" : isTrip ? "กำลังเที่ยวอยู่" : "แผนวันเสาร์ของคุณ"}
          </h1>
          <p className="text-sm text-gn-mut">ออกจาก {plan.origin_name} → สยาม</p>
        </div>
        {isTrip && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gn-danger-bg px-3 py-1 text-xs font-extrabold text-gn-red">
            <span className="gn-live-dot inline-block h-2 w-2 rounded-full bg-gn-red" />
            LIVE · GPS: สยาม
          </span>
        )}
      </div>

      {/* ===== mode toggle (mockup ①) ===== */}
      <div className="flex rounded-[11px] bg-gn-cream p-1">
        <button
          onClick={() => router.replace(`/app/plan/${id}#plan`)}
          className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${
            isPlan ? "bg-gn-card text-gn-green-dark shadow-sm" : "text-gn-mut"
          }`}
        >
          🗓 วางแผน
        </button>
        <button
          onClick={() => router.replace(`/app/plan/${id}#trip`)}
          className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${
            isTrip ? "bg-gn-card text-gn-green-dark shadow-sm" : "text-gn-mut"
          }`}
        >
          🧭 กำลังเที่ยว
        </button>
      </div>

      {/* ===== PLAN MODE ===== */}
      {isPlan && (
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
              <li key={s.seq} className="flex items-center gap-3 rounded-2xl bg-gn-card p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gn-orange font-bold text-white">
                  {CATEGORY_EMOJI[s.venue.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.venue.name_th}</p>
                  <p className="text-xs text-gn-gray">
                    ~{s.est_cost}฿/คน · เดิน {s.venue.walk_min_from_hub} นาทีจาก BTS สยาม
                  </p>
                </div>
                <div className="whitespace-nowrap font-extrabold text-gn-green-dark">~{s.est_cost}฿</div>
              </li>
            ))}
          </ol>

          <BudgetBar
            est={plan.est_total}
            budget={plan.budget_planned}
            onEdit={() => {
              const v = window.prompt("งบใหม่ (฿)", String(plan.budget_planned));
              const n = v ? parseInt(v, 10) : NaN;
              if (n > 0) {
                act("budget_edit", { value: n });
                track("budget_edit", { value: n, screen: "S3" });
              }
            }}
          />

          {/* alt mode callout (mockup ③) */}
          {plan.route.kind === "cheapest" ? (
            <div className="rounded-[10px] border border-gn-amber-bd bg-gn-amber-bg px-3 py-2 text-[12.5px] text-gn-amber-fg">
              🚗 ขี้เกียจต่อรถ? Grab ทั้งขา ~180–210฿ · 35 นาที
              <button
                onClick={() => {
                  act("route_toggle");
                  showToast("สลับเป็น Grab แล้ว — งบรวมปรับตามทันที");
                }}
                className="ml-1.5 rounded-lg border border-gn-amber-cta-bd bg-gn-card px-2.5 py-0.5 text-xs font-bold text-gn-amber-cta"
              >
                สลับเป็น Grab
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-gn-amber-bd bg-gn-amber-bg px-3 py-2 text-[12.5px] text-gn-amber-fg">
              🛵 ประหยัดกว่า: วิน+เรือ+เดิน ~47฿ · 48 นาที
              <button
                onClick={() => {
                  act("route_toggle");
                  showToast("สลับเป็นเส้นทางประหยัดแล้ว");
                }}
                className="ml-1.5 rounded-lg border border-gn-amber-cta-bd bg-gn-card px-2.5 py-0.5 text-xs font-bold text-gn-amber-cta"
              >
                สลับเป็นประหยัด
              </button>
            </div>
          )}

          <button
            onClick={async () => {
              await act("start");
              track("plan_start_trip", { plan_id: plan.id });
              showToast("โหมดกำลังเที่ยว: ติ๊กบันทึกค่าใช้จ่ายจริงได้เลย");
              router.replace(`/app/plan/${id}#trip`);
            }}
            className="w-full rounded-xl bg-gn-orange py-3.5 text-base font-extrabold text-white shadow-md hover:bg-gn-orange-dark"
          >
            เริ่มเที่ยว ▶
          </button>
        </>
      )}

      {/* ===== TRIP MODE ===== */}
      {isTrip && (
        <>
          {/* budget box with orange progress (mockup live mode) */}
          <div className="rounded-xl border border-gn-mint-bd bg-gn-mint-bg p-3">
            <div className="flex justify-between font-extrabold text-gn-green-dark">
              <span>จ่ายจริงแล้ว {plan.spent}฿ / {plan.budget_planned}฿</span>
              <span>
                {plan.spent > plan.budget_planned
                  ? `เกิน ${plan.spent - plan.budget_planned}฿ ⚠️`
                  : plan.spent === plan.budget_planned
                    ? "ตามแผน ✓"
                    : `เหลือ ${plan.budget_planned - plan.spent}฿`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gn-mint-bar">
              <div
                className="h-full rounded-full bg-gn-orange"
                style={{ width: `${Math.min(100, (plan.spent / Math.max(1, plan.budget_planned)) * 100)}%` }}
              />
            </div>
          </div>

          {plan.warnings.map((w) => (
            <div key={w} className="rounded-xl border border-gn-amber-bd bg-gn-amber-bg px-4 py-2.5 text-sm text-gn-amber-fg">
              ⛴️ {w}
            </div>
          ))}

          {/* stops — expense checklist (mockup ④) */}
          <ol className="space-y-3">
            {plan.stops.map((s) => (
              <li key={s.seq} className="rounded-2xl bg-gn-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-extrabold text-white ${
                      s.checked_in_at ? "bg-gn-green" : "bg-gn-orange"
                    }`}
                  >
                    {s.checked_in_at ? "✓" : s.seq}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.venue.name_th}</p>
                    <p className="text-xs text-gn-gray">ประเมิน ~{s.est_cost}฿/คน</p>
                  </div>
                  {!s.checked_in_at && (
                    <button
                      onClick={async () => {
                        await act("checkin", { seq: s.seq });
                        track("checkin", { seq: s.seq, venue_id: s.venue.id });
                      }}
                      className="shrink-0 rounded-full bg-gn-navy px-4 py-1.5 text-sm font-medium text-white"
                    >
                      เช็คอิน
                    </button>
                  )}
                </div>

                {s.checked_in_at && s.actual_cost === null && (
                  <div className="mt-3 border-t border-gn-line/30 pt-3">
                    <p className="mb-2 text-sm font-medium">จ่ายจริงเท่าไหร่?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await act("spend", { seq: s.seq, amount: s.est_cost });
                          track("spend_log", { seq: s.seq, amount: s.est_cost });
                        }}
                        className="flex-1 rounded-full bg-gn-orange py-2 text-sm font-medium text-white"
                      >
                        ตามประเมิน {s.est_cost}฿
                      </button>
                      <button
                        onClick={async () => {
                          const v = window.prompt("จ่ายจริง (฿)");
                          const n = v ? parseInt(v, 10) : NaN;
                          if (n >= 0) {
                            await act("spend", { seq: s.seq, amount: n });
                            track("spend_log", { seq: s.seq, amount: n });
                          }
                        }}
                        className="flex-1 rounded-full border border-gn-navy/15 py-2 text-sm"
                      >
                        พิมพ์เอง…
                      </button>
                    </div>
                  </div>
                )}

                {s.actual_cost !== null && (
                  <p className="mt-2 text-sm text-gn-green">จ่ายแล้ว {s.actual_cost}฿ ✓</p>
                )}
              </li>
            ))}
          </ol>

          {/* replan (mockup ⑤) */}
          <button
            onClick={async () => {
              track("replan", { plan_id: plan.id });
              await openChain({ indoor: true });
            }}
            className="w-full rounded-full border border-gn-navy/15 bg-gn-card py-2.5 text-sm font-medium hover:border-gn-orange"
          >
            ☔ ฝนตก / แผนพัง — ปรับแผนใหม่ในงบที่เหลือ
          </button>

          <button
            onClick={async () => {
              await act("done");
              track("plan_done", { plan_id: plan.id });
              showToast("จบทริปแล้ว — ช่วย confirm ราคา 2 จุดแรกหน่อย 🙏");
              router.replace(`/app/plan/${id}#done`);
            }}
            className="w-full rounded-full bg-gn-navy py-3.5 text-base font-extrabold text-white shadow-md"
          >
            จบทริป ✓
          </button>
        </>
      )}

      {/* ===== DONE MODE (summary + price confirm) ===== */}
      {isDone && (
        <DoneSummary
          plan={plan}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          showToast={showToast}
        />
      )}

      {/* ===== chain / replan bottom sheet ===== */}
      {suggestions && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border-t border-gn-navy/10 bg-gn-card p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">
              {suggestions.indoor ? `ที่ในร่ม ในงบที่เหลือ (${plan.remaining}฿)` : `ไปต่อในงบที่เหลือ`}
            </h2>
            <button onClick={() => setSuggestions(null)} className="text-sm text-gn-gray">
              ปิด
            </button>
          </div>
          {suggestions.list.length === 0 && (
            <p className="text-sm text-gn-gray">
              {(() => {
                const h = parseInt(
                  new Intl.DateTimeFormat("en-GB", {
                    timeZone: "Asia/Bangkok",
                    hour: "2-digit",
                    hour12: false,
                  }).format(now),
                  10,
                );
                return h >= 22 || h < 8
                  ? "เวลานี้ที่ใกล้ๆ ปิดหมดแล้ว — กลับบ้านก็ไม่ผิดนะ"
                  : "งบเหลือไม่พอสำหรับที่ใกล้ๆ — กลับบ้านก็ไม่ผิดนะ";
              })()}
            </p>
          )}
          <ul className="space-y-2">
            {suggestions.list.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl bg-gn-cream p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.name_th}</p>
                  <p className="text-xs text-gn-gray">~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน</p>
                </div>
                <button
                  onClick={async () => {
                    await act("add_stop", { venue_id: v.id });
                    setSuggestions(null);
                    showToast(`เพิ่ม ${v.name_th} เข้าแผนแล้ว`);
                  }}
                  className="shrink-0 rounded-full bg-gn-orange px-3 py-1.5 text-sm font-medium text-white"
                >
                  + เพิ่ม
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-gn-ink px-5 py-2.5 text-[13px] text-white">
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
  const toConfirm = plan.stops.filter((s) => s.actual_cost !== null).slice(0, 2);
  const over = (plan.budget_actual ?? 0) > plan.budget_planned;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gn-card p-4 shadow-sm">
        <p className="text-sm">
          แผน ~<b>{plan.est_total}฿</b> → จ่ายจริง{" "}
          <b className={over ? "text-gn-red" : "text-gn-green"}>
            {plan.budget_actual}฿
          </b>{" "}
          (งบตั้งไว้ {plan.budget_planned}฿)
        </p>
      </div>

      {toConfirm.filter((s) => !confirmed.has(s.venue.id)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold">ช่วย confirm ราคาให้เพื่อนนักเที่ยวหน่อย 🙏</h2>
          {toConfirm
            .filter((s) => !confirmed.has(s.venue.id))
            .map((s) => (
              <div key={s.venue.id} className="rounded-2xl bg-gn-card p-4 shadow-sm">
                <p className="mb-2 text-sm">
                  ราคาที่ <b>{s.venue.name_th}</b> ยัง ~{mid(s.venue.price_per_head_min, s.venue.price_per_head_max)}
                  ฿/คน อยู่ไหม?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      track("price_confirm", { venue_id: s.venue.id, ok: true, new_price: null });
                      setConfirmed(new Set(confirmed).add(s.venue.id));
                      showToast("ขอบคุณ! +10 แต้ม — ราคา Slowbar อัปเดตเข้าระบบแล้ว");
                    }}
                    className="flex-1 rounded-full bg-gn-green py-2 text-sm font-medium text-white"
                  >
                    ใช่ ✓
                  </button>
                  <button
                    onClick={() => {
                      const v = window.prompt("ราคาจริงตอนนี้ (฿/คน)");
                      const n = v ? parseInt(v, 10) : NaN;
                      if (n > 0) {
                        track("price_confirm", { venue_id: s.venue.id, ok: false, new_price: n });
                        setConfirmed(new Set(confirmed).add(s.venue.id));
                        showToast(`อัปเดตเป็น ${n}฿ แล้ว — ขอบคุณ!`);
                      }
                    }}
                    className="flex-1 rounded-full border border-gn-navy/15 py-2 text-sm"
                  >
                    เปลี่ยนเป็น…
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* points box (mockup ⑥) */}
      <div className="rounded-[10px] border border-gn-pts-bd bg-gn-pts-bg px-3 py-2.5 text-[12.5px] text-gn-pts-fg">
        🎁 หลังทริป: ยืนยันราคาจริง 3 รายการ รับ <b>+10 แต้ม</b> — ข้อมูลของคุณช่วยให้เพื่อนคนถัดไปประเมินงบแม่นขึ้น
      </div>
    </div>
  );
}
