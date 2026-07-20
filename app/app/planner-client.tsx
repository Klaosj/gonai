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
import { useCountUp } from "@/lib/use-count-up";
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

// ambience ต่อ intent — ใช้กับ hero กลาง (plan §2/§3.3)
const INTENT_AMBIENCE: Record<Intent, string> = {
  work: "o-ambience-work",
  date: "o-ambience-date",
  photo: "o-ambience-photo",
  family: "o-ambience-family",
};

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

  // hooks ต้องมาก่อน early return ทุกตัว
  const spent = plan?.spent ?? 0;
  const left = budget - spent;
  const spentAnim = useCountUp(spent);
  const leftAnim = useCountUp(Math.abs(left));

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">📡</p>
        <p className="mt-3 font-bold text-ink">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-mut">เช็คอินเทอร์เน็ตแล้วลองใหม่</p>
        <button onClick={load} className="gn-press gn-cta o-pill-primary o-btn-label mt-4 px-6 py-2.5">
          ลองอีกครั้ง ↻
        </button>
      </div>
    );
  }
  if (!data) return <LoadingSkeleton />;

  const list = showMore ? [...data.cards, ...data.more] : data.cards;
  // key เปลี่ยนตามชุดผลลัพธ์ → การ์ดเล่น entrance ใหม่ทุกครั้งที่กรอง/เปลี่ยน intent
  const listKey = list.map((v) => v.id).join(",");
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
        <aside className="gn-card-e gn-rise flex max-h-[calc(100vh-180px)] flex-col gap-2.5 overflow-auto p-4 gn-noscroll">
          <span className="gn-step">01 — เงื่อนไขของคุณ</span>

          <div className="flex flex-col gap-2.5">
            <div className="self-end rounded-2xl bg-card-solid px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
              {intent === "work"
                ? `อยากนั่งทำงาน ออกจาก${originName}`
                : intent === "date"
                  ? `เดท ออกจาก${originName} งบ ${budget}฿`
                  : intent === "photo"
                    ? `หาที่ถ่ายรูปสวยๆ งบ ${budget}฿`
                    : `ไปกับครอบครัว งบ ${budget}฿`}
            </div>
            <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
              คัดมา <b>Top {data.cards.length} จาก {data.total} ที่</b>
              {activeFilters.length > 0 && (
                <span className="text-mut"> · กรอง: {activeFilters.map((c) => c.label).join(" · ")}</span>
              )}
              <div className="mt-2 divide-y divide-line rounded-lg border border-line bg-card-solid/40 p-2.5 text-[12.5px]">
                {data.routes.cheapest.legs.map((l) => (
                  <div key={l.seq} className="flex justify-between py-1 text-mut first:pt-0 last:pb-0">
                    <span>{l.detail_th}</span>
                    <span className="text-ink">{l.price_max > 0 ? `${l.price_min}-${l.price_max}฿` : "0฿"}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-baseline justify-between pt-2">
                  <span className="o-mono text-[10px] text-mut">
                    รวมขาไป · {data.routes.cheapest.legs.reduce((s, l) => s + l.minutes, 0)} นาที
                  </span>
                  <span className="gn-num text-[22px] font-semibold text-ink">
                    {data.routes.cheapest.legs.reduce((s, l) => s + l.price_min, 0)}฿
                  </span>
                </div>
              </div>
            </div>
            {/* คำเตือนฝนจริงจาก Open-Meteo — ไม่มีข้อมูล = ไม่โชว์ */}
            {showRain && (
              <div className="rounded-2xl border border-warn/40 bg-card-solid px-3.5 py-2.5 text-[12.5px] text-warn">
                ☔ <b>พยากรณ์วันนี้:</b> โอกาสฝน {rain.maxProb}%
                {rain.peakHour !== null && ` ช่วง ~${rain.peakHour}:00`}
                {!filters.indoor && (
                  <button
                    onClick={() => toggleFilter("indoor")}
                    className="gn-press ml-1.5 rounded-lg border border-warn/50 bg-bg px-2 py-0.5 text-[11.5px] font-bold text-warn"
                  >
                    กรองเฉพาะในร่ม
                  </button>
                )}
                <button onClick={() => setRainDismissed(true)} className="ml-1.5 text-[11.5px] text-warn underline">
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
                  className={`gn-press rounded-full border px-3 py-1.5 text-[12.5px] ${
                    on
                      ? "border-pill bg-pill font-semibold text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-line bg-card-solid/40 p-3">
            <h4 className="o-mono mb-1.5 text-[11px] text-accent">📎 เห็นที่น่าไปจาก TikTok / IG?</h4>
            <div className="flex gap-1.5">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitImport()}
                placeholder="วางลิงก์คลิปที่นี่..."
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-mut"
              />
              <button
                onClick={submitImport}
                className="gn-press o-btn-label rounded-lg bg-accent px-3 py-1.5 text-[12.5px] text-bg"
              >
                ส่ง
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-mut">ทีมงานดึงข้อมูลจริงให้ใน 24 ชม. — ไม่ใช่บอทอัตโนมัติ</p>
          </div>
        </aside>

        {/* ====== col 2: Top 3 + hero + intent chips ====== */}
        <section className="gn-card-e gn-rise gn-d1 p-4">
          <span className="gn-step">02 — เลือกสถานที่ — คัดมา {data.cards.length} จาก {data.total} ที่</span>

          <div
            className={`o-grain gn-shine relative mb-3 mt-2 h-[150px] overflow-hidden rounded-xl ${INTENT_AMBIENCE[intent]}`}
          >
            <div className="absolute bottom-3 left-4 z-[2] text-ink drop-shadow-md">
              <b className="o-serif text-[20px] font-medium">
                <em>{originName} → สยาม</em>
              </b>
              <br />
              <span className="o-mono text-[10px] text-ink/85">
                {intentLabel} · งบ {budget}฿
              </span>
            </div>
          </div>

          {/* origin picker — หัวใจของ "รู้งบก่อนออกจากบ้าน" */}
          <div className="mb-3">
            <p className="o-mono mb-1.5 text-[10px] text-mut">📍 ออกจากย่านไหน?</p>
            <div className="flex flex-wrap gap-1.5">
              {data.zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => pickOrigin(z.id)}
                  className={`gn-press rounded-full border px-3 py-1 text-xs ${
                    origin === z.id
                      ? "border-pill bg-pill font-semibold text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {z.name_th}
                </button>
              ))}
              <button
                onClick={() => pickOrigin("other")}
                className={`gn-press rounded-full border px-3 py-1 text-xs ${
                  origin === "other"
                    ? "border-pill bg-pill font-semibold text-bg"
                    : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                }`}
              >
                อื่นๆ
              </button>
            </div>
            {data.routes.fallback && (
              <p className="mt-1.5 text-[11.5px] text-warn">
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
                  className={`gn-press rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold ${
                    on
                      ? "border-pill bg-pill text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>

          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-mut">
              ไม่มีที่ตรงทุกเงื่อนไขเลย 😅 — ลองปิดตัวกรองบางตัวดู
            </div>
          ) : (
            <div key={listKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v, i) => (
                <div key={v.id} className={`gn-rise ${i < 6 ? `gn-d${i + 1}` : ""}`}>
                <VenueCard
                  venue={v}
                  cheapest={data.routes.cheapest}
                  fastest={data.routes.fastest}
                  saved={saved.has(v.id)}
                  onAdd={() => addToPlan(v.id, v.name_th)}
                  onSave={() => toggleSave(v)}
                  onToggleRoute={(kind) => track("route_alt_toggle", { venue_id: v.id, kind, screen: "planner" })}
                />
                </div>
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
                className="gn-press o-pill-dark o-btn-label px-5 py-2 text-sm"
              >
                ดูตัวเลือกเพิ่มอีก {data.more.length} ที่ ▾
              </button>
            </div>
          )}
        </section>

        {/* ====== col 3: plan + budget ====== */}
        <aside className="gn-card-e gn-rise gn-d2 p-4">
          <span className="gn-step">03 — แผน + งบของคุณ</span>

          <div className="mt-2 mb-3 rounded-xl border border-line bg-card-solid/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="o-mono text-[10px] text-mut">งบวันนี้</span>
              {editingBudget ? (
                <input
                  type="number"
                  autoFocus
                  defaultValue={budget}
                  onBlur={(e) => editBudget(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-20 rounded-full border border-line bg-bg px-2 py-0.5 text-ink"
                />
              ) : (
                <button
                  onClick={() => setEditingBudget(true)}
                  className="gn-press rounded-full border border-line bg-bg px-2.5 py-0.5 text-xs font-semibold text-ink"
                >
                  {budget}฿ ✎
                </button>
              )}
            </div>
            <div className="gn-num flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-[32px] font-semibold leading-none text-ink">
                ใช้ไป {spentAnim}฿ / {budget}฿
              </span>
            </div>
            <div className={`mt-1 text-xs font-semibold ${left < 0 ? "text-bad" : "text-ok"}`}>
              {left >= 0 ? `เหลือ ${leftAnim}฿` : `เกินงบ ${leftAnim}฿ ⚠️`}
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line">
              <div
                className={`gn-bar h-full rounded-full ${left < 0 ? "bg-bad" : pct > 80 ? "bg-warn" : "bg-ok"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {plan ? (
            <>
              <div className="flex flex-col">
                {plan.stops.map((s, i) => (
                  <div key={s.seq} className="flex gap-2.5 border-b border-dashed border-line py-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card-solid text-[13px]">
                      {i === 0 ? "🏠" : CATEGORY_EMOJI[s.venue.category]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="text-[13.5px] text-ink">{s.venue.name_th}</b>
                      <small className="block leading-relaxed text-mut">
                        ~{s.est_cost}฿/คน · เดิน {s.venue.walk_min_from_hub} นาที
                      </small>
                    </div>
                    <div className="gn-num whitespace-nowrap font-semibold text-ink">~{s.est_cost}฿</div>
                  </div>
                ))}
              </div>

              {plan.warnings.length > 0 && (
                <div className="mt-2 rounded-lg border border-warn/40 bg-card-solid px-3 py-2 text-[12.5px] text-warn">
                  {plan.warnings.map((w) => (
                    <div key={w}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              {plan.remaining > 0 && (
                <div className="mt-3">
                  <h5 className="mb-1.5 text-[13px] font-bold text-ink">เหลืองบ {plan.remaining}฿ — ไปไหนต่อได้อีก</h5>
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
                    className="gn-press o-pill-dark o-btn-label w-full py-2 text-[12.5px]"
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
                className="gn-press gn-cta o-pill-primary o-btn-label mt-3 w-full py-3"
              >
                เริ่มเที่ยว ▶
              </button>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-mut">
              ยังไม่มีแผน — กด <b className="text-ink">+ เพิ่มเข้าแผน</b> บนการ์ดด้านกลาง
            </div>
          )}

          <div className="mt-3 text-center text-[11.5px] text-mut">
            ประเมินจากช่วงราคาแต่ละที่ + ค่าเดินทาง เผื่อไว้ 10%
          </div>
        </aside>
      </div>

      {/* chain picker — เลือกแล้วเพิ่มเข้าแผนได้จริง */}
      {chainList && plan && (
        <div className="gn-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border border-b-0 border-line bg-card-solid p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">ไปต่อในงบที่เหลือ ({plan.remaining}฿)</h2>
            <button onClick={() => setChainList(null)} className="text-sm text-mut">
              ปิด
            </button>
          </div>
          {chainList.length === 0 && (
            <p className="text-sm text-mut">ตอนนี้ไม่มีที่เปิดอยู่ในงบที่เหลือ — กลับบ้านก็ไม่ผิดนะ</p>
          )}
          <ul className="space-y-2">
            {chainList.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elev p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{v.name_th}</p>
                  <p className="text-xs text-mut">~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน</p>
                </div>
                <button
                  onClick={async () => {
                    await act("add_stop", { venue_id: v.id });
                    setChainList(null);
                    showToast(`เพิ่ม ${v.name_th} เข้าแผนแล้ว`);
                  }}
                  className="gn-press o-pill-primary o-btn-label shrink-0 px-3 py-1.5 text-sm"
                >
                  + เพิ่ม
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

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};
