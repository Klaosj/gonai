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
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { ExpandedPlan } from "@/lib/server";
import { MODE_LABELS, type Route, type Venue } from "@/lib/types";

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
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
      showToast("โหลดคำแนะนำไม่สำเร็จ");
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🧭</p>
        <p className="mt-3 font-bold">โหลดแผนไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-gn-mut">แผนอาจถูกลบไปแล้ว หรืออินเทอร์เน็ตมีปัญหา</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={load} className="rounded-full bg-gn-orange px-6 py-2.5 font-bold text-white">
            ลองอีกครั้ง ↻
          </button>
          <button
            onClick={() => router.push("/app")}
            className="rounded-full border border-gn-line px-6 py-2.5 font-bold"
          >
            กลับหน้าวางแผน
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

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4">
      {/* ===== header ===== */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="gn-serif text-[22px] font-extrabold">
            {isDone ? "จบทริป ✓" : plan.status === "active" ? "กำลังเที่ยวอยู่" : "แผนของคุณ"}
          </h1>
          <p className="text-sm text-gn-mut">ออกจาก {plan.origin_name} → สยาม</p>
        </div>
        {plan.status === "active" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gn-danger-bg px-3 py-1 text-xs font-extrabold text-gn-red">
            <span className="gn-live-dot inline-block h-2 w-2 rounded-full bg-gn-red" />
            LIVE
          </span>
        )}
      </div>

      {/* ===== view toggle — ใช้ได้จริงเมื่อ active ===== */}
      {!isDone && (
        <div className="flex rounded-[11px] bg-gn-cream p-1">
          <button
            onClick={() => setView("plan")}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${
              showPlan ? "bg-gn-card text-gn-green-dark shadow-sm" : "text-gn-mut"
            }`}
          >
            🗓 แผน + เส้นทาง
          </button>
          <button
            onClick={() => {
              if (plan.status === "draft") {
                showToast("กด 'เริ่มเที่ยว ▶' ก่อน แล้วโหมดนี้จะเปิด");
                return;
              }
              setView("trip");
            }}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${
              showTrip ? "bg-gn-card text-gn-green-dark shadow-sm" : "text-gn-mut"
            } ${plan.status === "draft" ? "opacity-50" : ""}`}
          >
            🧭 กำลังเที่ยว
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

          <BudgetBar est={plan.est_total} budget={plan.budget_planned} onEdit={() => setEditingBudget(true)} />

          {editingBudget && (
            <div className="flex items-center gap-2 rounded-xl border border-gn-orange/40 bg-gn-card p-3">
              <span className="text-sm font-semibold">งบใหม่:</span>
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
                className="w-24 rounded-lg border border-gn-line px-2.5 py-1.5 text-sm"
              />
              <span className="text-xs text-gn-mut">฿ · Enter เพื่อยืนยัน</span>
              <button onClick={() => setEditingBudget(false)} className="ml-auto text-xs text-gn-mut underline">
                ยกเลิก
              </button>
            </div>
          )}

          {/* callout สลับเส้นทาง — ตัวเลขจาก data จริงของ origin นี้ */}
          {plan.route.kind === "cheapest" ? (
            <div className="rounded-[10px] border border-gn-amber-bd bg-gn-amber-bg px-3 py-2 text-[12.5px] text-gn-amber-fg">
              🚗 ขี้เกียจต่อรถ? {fast.modes} {fast.price} · {fast.mins} นาที
              <button
                onClick={() => {
                  act("route_toggle");
                  showToast("สลับเส้นทางแล้ว — งบรวมปรับตามทันที");
                }}
                className="ml-1.5 rounded-lg border border-gn-amber-cta-bd bg-gn-card px-2.5 py-0.5 text-xs font-bold text-gn-amber-cta"
              >
                สลับเป็นเร็วสุด
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-gn-amber-bd bg-gn-amber-bg px-3 py-2 text-[12.5px] text-gn-amber-fg">
              🛵 ประหยัดกว่า: {cheap.modes} {cheap.price} · {cheap.mins} นาที
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

          {plan.status === "draft" && (
            <button
              onClick={async () => {
                await act("start");
                track("plan_start_trip", { plan_id: plan.id });
                setView("trip");
                showToast("โหมดกำลังเที่ยว: เช็คอิน + บันทึกจ่ายจริงได้เลย");
              }}
              className="w-full rounded-xl bg-gn-orange py-3.5 text-base font-extrabold text-white shadow-md hover:bg-gn-orange-dark"
            >
              เริ่มเที่ยว ▶
            </button>
          )}
        </>
      )}

      {/* ===== TRIP VIEW ===== */}
      {showTrip && (
        <>
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
                    <p className="text-xs text-gn-gray">
                      ประเมิน ~{s.est_cost}฿/คน ·{" "}
                      <a
                        href={mapsUrl(s.venue)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gn-green underline"
                        onClick={() => track("open_maps", { venue_id: s.venue.id })}
                      >
                        นำทาง 🗺
                      </a>
                    </p>
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
                    {spendingSeq === s.seq ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          autoFocus
                          placeholder="฿"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              const n = parseInt((e.target as HTMLInputElement).value, 10);
                              if (n >= 0) {
                                await act("spend", { seq: s.seq, amount: n });
                                track("spend_log", { seq: s.seq, amount: n });
                              }
                              setSpendingSeq(null);
                            }
                            if (e.key === "Escape") setSpendingSeq(null);
                          }}
                          className="w-28 rounded-full border border-gn-line px-3 py-2 text-sm"
                        />
                        <span className="text-xs text-gn-mut">Enter เพื่อบันทึก</span>
                        <button onClick={() => setSpendingSeq(null)} className="ml-auto text-xs text-gn-mut underline">
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
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
                          onClick={() => setSpendingSeq(s.seq)}
                          className="flex-1 rounded-full border border-gn-navy/15 py-2 text-sm"
                        >
                          พิมพ์เอง…
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {s.actual_cost !== null && (
                  <p className="mt-2 text-sm text-gn-green">จ่ายแล้ว {s.actual_cost}฿ ✓</p>
                )}
              </li>
            ))}
          </ol>

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
              showToast("จบทริปแล้ว 🎉 ช่วยยืนยันราคาให้เพื่อนนักเที่ยวหน่อย");
            }}
            className="w-full rounded-full bg-gn-navy py-3.5 text-base font-extrabold text-white shadow-md"
          >
            จบทริป ✓
          </button>
        </>
      )}

      {/* ===== DONE ===== */}
      {isDone && (
        <DoneSummary plan={plan} confirmed={confirmed} setConfirmed={setConfirmed} showToast={showToast} />
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
                  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(
                    new Date(),
                  ),
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
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const toConfirm = plan.stops.filter((s) => s.actual_cost !== null).slice(0, 2);
  const over = (plan.budget_actual ?? 0) > plan.budget_planned;
  const diff = (plan.budget_actual ?? 0) - plan.budget_planned;

  return (
    <div className="space-y-4">
      {/* สรุปทริป */}
      <div className="rounded-2xl bg-gn-card p-5 shadow-sm">
        <p className="text-sm text-gn-mut">จ่ายจริงทั้งวัน</p>
        <p className={`gn-serif text-[40px] font-extrabold leading-tight ${over ? "text-gn-red" : "text-gn-green-dark"}`}>
          {plan.budget_actual}฿
        </p>
        <p className="text-sm text-gn-mut">
          งบตั้งไว้ {plan.budget_planned}฿ · แผนประเมิน ~{plan.est_total}฿ ·{" "}
          {diff > 0 ? `เกินงบ ${diff}฿` : diff === 0 ? "ตรงงบเป๊ะ" : `ต่ำกว่างบ ${-diff}฿ ✓`}
        </p>
        <div className="mt-3 space-y-1 border-t border-dashed border-gn-line pt-3 text-sm">
          {plan.stops.map((s) => (
            <div key={s.seq} className="flex justify-between">
              <span className="truncate">{CATEGORY_EMOJI[s.venue.category]} {s.venue.name_th}</span>
              <b className="ml-2 shrink-0">{s.actual_cost ?? s.est_cost}฿</b>
            </div>
          ))}
        </div>
      </div>

      {/* แชร์ recap — ปิดวง sharing */}
      <TripRecap plan={plan} onShared={showToast} />

      {/* confirm ราคา — copy ตรงกับสิ่งที่เกิดจริง: ส่งเข้าคิว validate ของทีม */}
      {toConfirm.filter((s) => !confirmed.has(s.venue.id)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold">ช่วยยืนยันราคาให้เพื่อนนักเที่ยวหน่อย 🙏</h2>
          {toConfirm
            .filter((s) => !confirmed.has(s.venue.id))
            .map((s) => (
              <div key={s.venue.id} className="rounded-2xl bg-gn-card p-4 shadow-sm">
                <p className="mb-2 text-sm">
                  ราคาที่ <b>{s.venue.name_th}</b> ยัง ~{mid(s.venue.price_per_head_min, s.venue.price_per_head_max)}
                  ฿/คน อยู่ไหม?
                </p>
                {editingPrice === s.venue.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      autoFocus
                      placeholder="฿/คน"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const n = parseInt((e.target as HTMLInputElement).value, 10);
                          if (n > 0) {
                            track("price_confirm", { venue_id: s.venue.id, ok: false, new_price: n });
                            setConfirmed(new Set(confirmed).add(s.venue.id));
                            showToast("ส่งราคาใหม่ให้ทีม validate แล้ว — ขอบคุณ!");
                          }
                          setEditingPrice(null);
                        }
                        if (e.key === "Escape") setEditingPrice(null);
                      }}
                      className="w-28 rounded-full border border-gn-line px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-gn-mut">Enter เพื่อส่ง</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        track("price_confirm", { venue_id: s.venue.id, ok: true, new_price: null });
                        setConfirmed(new Set(confirmed).add(s.venue.id));
                        showToast("ขอบคุณ! ข้อมูลนี้ช่วยให้งบของเพื่อนคนถัดไปแม่นขึ้น");
                      }}
                      className="flex-1 rounded-full bg-gn-green py-2 text-sm font-medium text-white"
                    >
                      ใช่ ✓
                    </button>
                    <button
                      onClick={() => setEditingPrice(s.venue.id)}
                      className="flex-1 rounded-full border border-gn-navy/15 py-2 text-sm"
                    >
                      เปลี่ยนเป็น…
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="rounded-[10px] border border-gn-pts-bd bg-gn-pts-bg px-3 py-2.5 text-[12.5px] text-gn-pts-fg">
        💚 ทุกการยืนยันถูกส่งเข้าคิว validate ของทีม — ที่ที่ยืนยันครบ 3 คนถึงจะขึ้นป้าย &quot;ราคาเช็คแล้ว&quot;
      </div>
    </div>
  );
}
