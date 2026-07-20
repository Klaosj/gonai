"use client";
// /app — รวม S1 (intent/origin/budget) + S2 (Top3 + ดูเพิ่ม + import) ในหน้าเดียว
// 3-col grid (เงื่อนไข | Top3 | plan+budget)
// หลักการ: ทุกอย่างที่ UI บอกว่าทำ ต้องทำจริง — ไม่มี toast หลอก
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import VenueCard from "@/components/VenueCard";
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import { filtersToParams, type VenueFilters } from "@/lib/filters";
import { BUDGET_DEFAULTS } from "@/lib/fixtures";
import type { ExpandedPlan } from "@/lib/server";
import type { Intent, Route, Venue, Zone } from "@/lib/types";
import type { RainForecast } from "@/lib/weather";

// 4 intents จริงเท่านั้น — "กินของอร่อย/ธรรมชาติ" เดิมเป็นปุ่มหลอก (ผลลัพธ์เป็น work) เลยตัดออก
const INTENTS: { key: Intent; label: string }[] = [
  { key: "work", label: "💻 นั่งทำงาน" },
  { key: "date", label: "💛 เดท" },
  { key: "photo", label: "📷 ถ่ายรูป" },
  { key: "family", label: "👨‍👩‍👧 ครอบครัว" },
];

// ตัวกรองจริง — ผูกกับ attribute ใน data (lib/filters.ts ฝั่ง server)
const FILTER_CHIPS: { key: keyof VenueFilters; label: string }[] = [
  { key: "near", label: "⏱ เดิน ≤10 นาที" },
  { key: "food", label: "🍚 มีอาหารจริงจัง" },
  { key: "quiet", label: "🎧 เงียบ/ประชุมได้" },
  { key: "plugs", label: "🔌 มีปลั๊ก" },
  { key: "indoor", label: "☂️ ในร่ม" },
];

interface VenuesResponse {
  cards: Venue[];
  more: Venue[];
  total: number;
  unseenPoolEmpty: boolean;
  savedIds: string[];
  routes: { cheapest: Route; fastest: Route; fallback: boolean };
  weather: RainForecast | null;
  zones: Zone[];
}

export default function PlannerClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [intent, setIntent] = useState<Intent>(() => {
    const q = sp.get("intent");
    return INTENTS.some((i) => i.key === q) ? (q as Intent) : "work";
  });
  const [origin, setOrigin] = useState(() => {
    if (sp.get("origin")) return sp.get("origin")!;
    try {
      return localStorage.getItem("gn_origin") ?? "bangkapi";
    } catch {
      return "bangkapi";
    }
  });
  const [budget, setBudget] = useState<number>(Number(sp.get("budget") ?? BUDGET_DEFAULTS[intent] ?? 800));
  const [editingBudget, setEditingBudget] = useState(false);
  const [filters, setFilters] = useState<VenueFilters>({});
  const [rainDismissed, setRainDismissed] = useState(false);

  const [data, setData] = useState<VenuesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [plan, setPlan] = useState<ExpandedPlan | null>(null);
  const [chainList, setChainList] = useState<Venue[] | null>(null);
  const autoAdded = useRef(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const load = useCallback(() => {
    setLoadError(false);
    gn<VenuesResponse>(`/api/venues?intent=${intent}&origin=${origin}${filtersToParams(filters)}`)
      .then((d) => {
        setData(d);
        setSaved(new Set(d.savedIds));
        track("results_view", { intent, origin, total: d.total });
      })
      .catch(() => setLoadError(true));
  }, [intent, origin, filters]);

  useEffect(load, [load]);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!plan) return null;
      const p = await gn<ExpandedPlan>(`/api/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...extra }),
      });
      setPlan(p);
      return p;
    },
    [plan],
  );

  const addToPlan = useCallback(
    async (venueId: string, venueName: string) => {
      if (plan) {
        await act("add_stop", { venue_id: venueId });
        track("add_stop", { venue_id: venueId, via: "card" });
        showToast(`เพิ่ม ${venueName} เข้าแผนแล้ว`);
        return;
      }
      try {
        track("add_stop", { venue_id: venueId });
        const { id } = await gn<{ id: string }>("/api/plans", {
          method: "POST",
          body: JSON.stringify({ intent, origin, venue_id: venueId, budget }),
        });
        const p = await gn<ExpandedPlan>(`/api/plans/${id}`);
        setPlan(p);
        showToast(`สร้างแผน + เพิ่ม ${venueName} แล้ว`);
      } catch {
        showToast("สร้างแผนไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
    },
    [plan, act, intent, origin, budget],
  );

  // มาจาก "วางแผนไป" ใน S5 (?add=<venueId>) → สร้างแผนด้วยที่นั้นทันที
  useEffect(() => {
    const addId = sp.get("add");
    if (!addId || autoAdded.current || plan) return;
    autoAdded.current = true;
    (async () => {
      await addToPlan(addId, "ที่ที่บันทึกไว้");
      router.replace("/app");
    })();
  }, [sp, plan, addToPlan, router]);

  const toggleSave = async (venue: Venue) => {
    try {
      const res = await gn<{ saved: boolean }>("/api/saves", {
        method: "POST",
        body: JSON.stringify({ venue_id: venue.id }),
      });
      setSaved((prev) => {
        const next = new Set(prev);
        if (res.saved) next.add(venue.id);
        else next.delete(venue.id);
        return next;
      });
      if (res.saved) track("save_venue", { venue_id: venue.id });
    } catch {
      showToast("บันทึกไม่สำเร็จ");
    }
  };

  const submitImport = async () => {
    if (!importUrl.trim()) return;
    try {
      await gn("/api/imports", { method: "POST", body: JSON.stringify({ url: importUrl.trim() }) });
      setImportUrl("");
      showToast("รับลิงก์แล้ว 🎬 ทีมงานดึงข้อมูลใน 24 ชม. — ดูสถานะในแท็บ ทริปของฉัน");
    } catch (e) {
      showToast(e instanceof Error ? e.message.replace(/^\d+: /, "") : "ส่งลิงก์ไม่สำเร็จ");
    }
  };

  const editBudget = (v: number) => {
    if (v > 0) {
      setBudget(v);
      if (plan) act("budget_edit", { value: v });
      track("budget_edit", { value: v, screen: "planner" });
    }
    setEditingBudget(false);
  };

  const pickOrigin = (id: string) => {
    setOrigin(id);
    try {
      localStorage.setItem("gn_origin", id);
    } catch {}
    track("origin_change", { origin: id });
  };

  const toggleFilter = (key: keyof VenueFilters) => {
    setFilters((f) => {
      const next = { ...f, [key]: !f[key] };
      track("filter_toggle", { key, on: !f[key] });
      return next;
    });
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">📡</p>
        <p className="mt-3 font-bold">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-gn-mut">เช็คอินเทอร์เน็ตแล้วลองใหม่</p>
        <button
          onClick={load}
          className="mt-4 rounded-full bg-gn-orange px-6 py-2.5 font-bold text-white"
        >
          ลองอีกครั้ง ↻
        </button>
      </div>
    );
  }
  if (!data) return <LoadingSkeleton />;

  const list = showMore ? [...data.cards, ...data.more] : data.cards;
  const spent = plan?.spent ?? 0;
  const left = budget - spent;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const originName = data.zones.find((z) => z.id === origin)?.name_th ?? "อื่นๆ";
  const intentLabel = INTENTS.find((i) => i.key === intent)!.label;
  const rain = data.weather;
  const showRain = rain?.rainExpected && !rainDismissed;
  const activeFilters = FILTER_CHIPS.filter((c) => filters[c.key]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[330px_1fr_360px]">
        {/* ====== col 1: เงื่อนไข + ตัวกรอง + import ====== */}
        <aside className="flex max-h-[calc(100vh-180px)] flex-col gap-2.5 overflow-auto rounded-2xl border border-gn-line bg-gn-card p-4 gn-noscroll">
          <span className="gn-step gn-step-green">① เงื่อนไขของคุณ</span>

          <div className="flex flex-col gap-2.5">
            <div className="self-end rounded-2xl bg-gn-chat-user px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
              {intent === "work"
                ? `อยากนั่งทำงาน ออกจาก${originName}`
                : intent === "date"
                  ? `เดท ออกจาก${originName} งบ ${budget}฿`
                  : intent === "photo"
                    ? `หาที่ถ่ายรูปสวยๆ งบ ${budget}฿`
                    : `ไปกับครอบครัว งบ ${budget}฿`}
            </div>
            <div className="rounded-2xl border border-gn-chat-ai-bd bg-gn-chat-ai-bg px-3.5 py-2.5 text-[13.5px] leading-relaxed">
              คัดมา <b>Top {data.cards.length} จาก {data.total} ที่</b>
              {activeFilters.length > 0 && (
                <span className="text-gn-mut"> · กรอง: {activeFilters.map((c) => c.label).join(" · ")}</span>
              )}
              <div className="mt-2 rounded-lg border border-dashed border-gn-chat-cost-bd bg-gn-chat-cost-bg p-2.5 text-[12.5px]">
                {data.routes.cheapest.legs.map((l) => (
                  <div key={l.seq} className="flex justify-between py-0.5">
                    <span>{l.detail_th}</span>
                    <span>{l.price_max > 0 ? `${l.price_min}-${l.price_max}฿` : "0฿"}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-gn-line pt-1 font-extrabold text-gn-green-dark">
                  <span>รวมขาไป · {data.routes.cheapest.legs.reduce((s, l) => s + l.minutes, 0)} นาที</span>
                  <span>{data.routes.cheapest.legs.reduce((s, l) => s + l.price_min, 0)}฿</span>
                </div>
              </div>
            </div>
            {/* คำเตือนฝนจริงจาก Open-Meteo — ไม่มีข้อมูล = ไม่โชว์ */}
            {showRain && (
              <div className="rounded-2xl border border-gn-amber-bd bg-gn-amber-bg px-3.5 py-2.5 text-[12.5px] text-gn-amber-fg">
                ☔ <b>พยากรณ์วันนี้:</b> โอกาสฝน {rain.maxProb}%
                {rain.peakHour !== null && ` ช่วง ~${rain.peakHour}:00`}
                {!filters.indoor && (
                  <button
                    onClick={() => toggleFilter("indoor")}
                    className="ml-1.5 rounded-lg border border-gn-amber-cta-bd bg-gn-card px-2 py-0.5 text-[11.5px] font-bold text-gn-amber-cta"
                  >
                    กรองเฉพาะในร่ม
                  </button>
                )}
                <button onClick={() => setRainDismissed(true)} className="ml-1.5 text-[11.5px] underline">
                  ซ่อน
                </button>
              </div>
            )}
          </div>

          {/* ตัวกรองจริง — กดแล้ว refetch ผลลัพธ์ */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_CHIPS.map((c) => {
              const on = !!filters[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => toggleFilter(c.key)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] transition ${
                    on
                      ? "border-gn-green-dark bg-gn-green-dark font-semibold text-white"
                      : "border-gn-line bg-gn-card hover:border-gn-green hover:text-gn-green"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border-[1.5px] border-dashed border-gn-import-bd bg-gn-import-bg p-3">
            <h4 className="mb-1.5 text-[13px] font-bold text-gn-purple">📎 เห็นที่น่าไปจาก TikTok / IG?</h4>
            <div className="flex gap-1.5">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitImport()}
                placeholder="วางลิงก์คลิปที่นี่..."
                className="min-w-0 flex-1 rounded-lg border border-gn-line px-2.5 py-1.5 text-[12.5px]"
              />
              <button
                onClick={submitImport}
                className="rounded-lg bg-gn-purple px-3 py-1.5 text-[12.5px] font-bold text-white"
              >
                ส่ง
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-gn-mut">ทีมงานดึงข้อมูลจริงให้ใน 24 ชม. — ไม่ใช่บอทอัตโนมัติ</p>
          </div>
        </aside>

        {/* ====== col 2: Top 3 + hero + intent chips ====== */}
        <section className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <span className="gn-step gn-step-orange">② เลือกสถานที่ — คัดมา {data.cards.length} จาก {data.total} ที่</span>

          <div className="relative mb-3 mt-2 h-[150px] overflow-hidden rounded-xl bg-gradient-to-br from-gn-green to-gn-purple">
            <div className="absolute bottom-3 left-4 text-white drop-shadow-md">
              <b className="gn-serif text-[19px]">{originName} → สยาม</b>
              <br />
              <span className="text-xs opacity-90">{intentLabel} · งบ {budget}฿</span>
            </div>
          </div>

          {/* origin picker — หัวใจของ "รู้งบก่อนออกจากบ้าน" */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-gn-mut">📍 ออกจากย่านไหน?</p>
            <div className="flex flex-wrap gap-1.5">
              {data.zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => pickOrigin(z.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    origin === z.id
                      ? "border-gn-navy bg-gn-navy font-bold text-white"
                      : "border-gn-line bg-gn-card text-gn-mut hover:border-gn-navy"
                  }`}
                >
                  {z.name_th}
                </button>
              ))}
              <button
                onClick={() => pickOrigin("other")}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  origin === "other"
                    ? "border-gn-navy bg-gn-navy font-bold text-white"
                    : "border-gn-line bg-gn-card text-gn-mut hover:border-gn-navy"
                }`}
              >
                อื่นๆ
              </button>
            </div>
            {data.routes.fallback && (
              <p className="mt-1.5 text-[11.5px] text-gn-amber-cta">
                ⚠️ เส้นทางจากย่านนี้ยังไม่ validate — ประมาณด้วยสูตร Grab ไปก่อน
              </p>
            )}
          </div>

          {/* intent chips — 4 ตัวจริง */}
          <div className="mb-4 flex flex-wrap gap-2">
            {INTENTS.map((i) => {
              const on = intent === i.key;
              return (
                <button
                  key={i.key}
                  onClick={() => {
                    setIntent(i.key);
                    setBudget(BUDGET_DEFAULTS[i.key]);
                    track("search", { intent: i.key, origin });
                  }}
                  className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    on
                      ? "border-gn-green-dark bg-gn-green-dark text-white"
                      : "border-gn-line bg-gn-card hover:border-gn-green"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>

          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gn-line py-10 text-center text-sm text-gn-mut">
              ไม่มีที่ตรงทุกเงื่อนไขเลย 😅 — ลองปิดตัวกรองบางตัวดู
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  cheapest={data.routes.cheapest}
                  fastest={data.routes.fastest}
                  saved={saved.has(v.id)}
                  onAdd={() => addToPlan(v.id, v.name_th)}
                  onSave={() => toggleSave(v)}
                  onToggleRoute={(kind) => track("route_alt_toggle", { venue_id: v.id, kind, screen: "planner" })}
                />
              ))}
            </div>
          )}

          {!showMore && data.more.length > 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  setShowMore(true);
                  track("card_view_more", { count: data.more.length });
                }}
                className="rounded-full border-[1.5px] border-gn-line bg-gn-card px-5 py-2 font-bold text-gn-mut"
              >
                ดูตัวเลือกเพิ่มอีก {data.more.length} ที่ ▾
              </button>
            </div>
          )}
        </section>

        {/* ====== col 3: plan + budget ====== */}
        <aside className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <span className="gn-step gn-step-green">③ แผน + งบของคุณ</span>

          <div className="mt-2 mb-3 rounded-xl border border-gn-mint-bd bg-gn-mint-bg p-3">
            <div className="flex justify-between font-extrabold text-gn-green-dark">
              <span>ใช้ไป {spent}฿ / {budget}฿</span>
              <span>{left >= 0 ? `เหลือ ${left}฿` : `เกินงบ ${-left}฿ ⚠️`}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gn-mint-bar">
              <div
                className={`h-full rounded-full ${left < 0 ? "bg-gn-red" : "bg-gn-green"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className="text-gn-mut">งบวันนี้:</span>
              {editingBudget ? (
                <input
                  type="number"
                  autoFocus
                  defaultValue={budget}
                  onBlur={(e) => editBudget(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-20 rounded-full border border-gn-orange px-2 py-0.5"
                />
              ) : (
                <button
                  onClick={() => setEditingBudget(true)}
                  className="rounded-full bg-gn-card px-2.5 py-0.5 font-bold shadow-sm"
                >
                  {budget}฿ ✎
                </button>
              )}
            </div>
          </div>

          {plan ? (
            <>
              <div className="flex flex-col">
                {plan.stops.map((s, i) => (
                  <div key={s.seq} className="flex gap-2.5 border-b border-dashed border-gn-line py-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gn-mint-bd bg-gn-mint-bg text-[13px]">
                      {i === 0 ? "🏠" : CATEGORY_EMOJI[s.venue.category]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="text-[13.5px]">{s.venue.name_th}</b>
                      <small className="block leading-relaxed text-gn-mut">
                        ~{s.est_cost}฿/คน · เดิน {s.venue.walk_min_from_hub} นาที
                      </small>
                    </div>
                    <div className="whitespace-nowrap font-extrabold text-gn-green-dark">~{s.est_cost}฿</div>
                  </div>
                ))}
              </div>

              {plan.warnings.length > 0 && (
                <div className="mt-2 rounded-lg border border-gn-amber-bd bg-gn-amber-bg px-3 py-2 text-[12.5px] text-gn-amber-fg">
                  {plan.warnings.map((w) => (
                    <div key={w}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              {plan.remaining > 0 && (
                <div className="mt-3">
                  <h5 className="mb-1.5 text-[13px] font-bold">เหลืองบ {plan.remaining}฿ — ไปไหนต่อได้อีก</h5>
                  <button
                    onClick={async () => {
                      try {
                        const list = await gn<Venue[]>(`/api/chain?planId=${plan.id}`);
                        setChainList(list);
                        track("chain_open", { plan_id: plan.id, count: list.length });
                      } catch {
                        showToast("โหลดคำแนะนำไม่สำเร็จ");
                      }
                    }}
                    className="w-full rounded-lg border border-gn-line bg-gn-card py-2 text-[12.5px] font-semibold hover:border-gn-green"
                  >
                    + ไปไหนต่อดี
                  </button>
                </div>
              )}

              <button
                onClick={async () => {
                  await act("start");
                  track("plan_start_trip", { plan_id: plan.id });
                  router.push(`/app/plan/${plan.id}`);
                }}
                className="mt-3 w-full rounded-xl bg-gn-orange py-3 font-extrabold text-white hover:bg-gn-orange-dark"
              >
                เริ่มเที่ยว ▶
              </button>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-gn-mut">
              ยังไม่มีแผน — กด <b className="text-gn-green">+ เพิ่มเข้าแผน</b> บนการ์ดด้านกลาง
            </div>
          )}

          <div className="mt-3 text-center text-[11.5px] text-gn-mut">
            ประเมินจากช่วงราคาแต่ละที่ + ค่าเดินทาง เผื่อไว้ 10%
          </div>
        </aside>
      </div>

      {/* chain picker — เลือกแล้วเพิ่มเข้าแผนได้จริง */}
      {chainList && plan && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border-t border-gn-navy/10 bg-gn-card p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">ไปต่อในงบที่เหลือ ({plan.remaining}฿)</h2>
            <button onClick={() => setChainList(null)} className="text-sm text-gn-gray">
              ปิด
            </button>
          </div>
          {chainList.length === 0 && (
            <p className="text-sm text-gn-gray">ตอนนี้ไม่มีที่เปิดอยู่ในงบที่เหลือ — กลับบ้านก็ไม่ผิดนะ</p>
          )}
          <ul className="space-y-2">
            {chainList.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl bg-gn-cream p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.name_th}</p>
                  <p className="text-xs text-gn-gray">~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน</p>
                </div>
                <button
                  onClick={async () => {
                    await act("add_stop", { venue_id: v.id });
                    setChainList(null);
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

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};
