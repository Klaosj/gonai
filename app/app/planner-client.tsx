"use client";
// /app — รวม S1 (intent/origin/budget) + S2 (Top3 + ดูเพิ่ม + import) ในหน้าเดียว
// 3-col grid (เงื่อนไข | Top3 | plan+budget)
// หลักการ: ทุกอย่างที่ UI บอกว่าทำ ต้องทำจริง — ไม่มี toast หลอก
//
// T1.7: แตกออกเป็น 3 ก้อน — lib/use-venue-search.ts (state ค้นร้าน: intent/origin/budget/filters/data)
// + components/ChatPanel.tsx (chat state ทั้งหมด — พิมพ์แชทไม่ลาก re-render การ์ดทั้งหน้าอีกต่อไป)
// + ไฟล์นี้ (mood tiles / import box / plan+budget คอลัมน์ 3 / VenueCard grid) เหมือนเดิม
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import SplitPay from "@/components/SplitPay";
import { MoneyProgressBar } from "@/components/MoneyProgress";
import Odo from "@/components/Odo";
import { ChatPanel } from "@/components/ChatPanel";
import { StopTimelineList } from "@/components/StopTimelineList";
import VenueCard from "@/components/VenueCard";
import { VenueSuggestSheet } from "@/components/VenueSuggestSheet";
import { gn, track } from "@/lib/api";
import type { ChatActions } from "@/lib/chat";
import { tripTitle } from "@/lib/timeline";
import type { VenueFilters } from "@/lib/filters";
import { useMe } from "@/lib/me-context";
import { useCountUp } from "@/lib/use-count-up";
import { usePlan } from "@/lib/use-plan";
import { useToast } from "@/lib/use-toast";
import { INTENTS, useVenueSearch } from "@/lib/use-venue-search";
import { BUDGET_DEFAULTS } from "@/lib/fixtures";
import type { ExpandedPlan } from "@/lib/server";
import type { Intent, Venue } from "@/lib/types";
import { INTENT_AMBIENCE } from "@/lib/venue-display";

// Mood tiles (plan §1) — แตะเดียว = ตั้ง intent+filters+budget จริง แล้ว refetch
// subtitle เขียนจาก filters ที่ tile ตั้งจริงเท่านั้น (ห้ามเขียนเกินสิ่งที่ tile ทำ)
const MOODS: { key: Intent; emoji: string; label: string; timeframe: string; filters: VenueFilters; ambience: string }[] = [
  { key: "work", emoji: "💻", label: "Work out of home", timeframe: "Mood · today", filters: { quiet: true, plugs: true }, ambience: "o-ambience-work" },
  { key: "date", emoji: "💛", label: "Date this week", timeframe: "Mood · Saturday", filters: {}, ambience: "o-ambience-date" },
  { key: "family", emoji: "👨‍👩‍👧", label: "Family day", timeframe: "Mood · family", filters: { indoor: true }, ambience: "o-ambience-family" },
  { key: "photo", emoji: "📷", label: "Photo walk", timeframe: "Mood · golden hour", filters: {}, ambience: "o-ambience-photo" },
];

const MOOD_FILTER_LABELS: Partial<Record<keyof VenueFilters, string>> = {
  near: "short walk",
  food: "real meals",
  quiet: "quiet",
  plugs: "plugs",
  indoor: "indoor",
};

function moodSubtitle(m: (typeof MOODS)[number]): string {
  const labels = (Object.keys(m.filters) as (keyof VenueFilters)[])
    .filter((k) => m.filters[k])
    .map((k) => MOOD_FILTER_LABELS[k])
    .filter((x): x is string => !!x);
  return [...labels, `~${BUDGET_DEFAULTS[m.key]}฿ budget`].join(" · ");
}

// ตัวกรองจริง — ผูกกับ attribute ใน data (lib/filters.ts ฝั่ง server)
const FILTER_CHIPS: { key: keyof VenueFilters; label: string }[] = [
  { key: "near", label: "⏱ ≤10 min walk" },
  { key: "food", label: "🍚 Real meals" },
  { key: "quiet", label: "🎧 Quiet / call-friendly" },
  { key: "plugs", label: "🔌 Plugs" },
  { key: "indoor", label: "☂️ Indoor" },
];

export default function PlannerClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const {
    intent,
    setIntent,
    origin,
    setOrigin,
    pickOrigin,
    budget,
    setBudget,
    filters,
    setFilters,
    toggleFilter,
    data,
    loadError,
    reload,
    onLoaded,
    pickMood,
  } = useVenueSearch();
  const [editingBudget, setEditingBudget] = useState(false);
  const [rainDismissed, setRainDismissed] = useState(false);

  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [importUrl, setImportUrl] = useState("");
  const [plan, setPlan] = useState<ExpandedPlan | null>(null);
  const [chainList, setChainList] = useState<Venue[] | null>(null);
  const autoAdded = useRef(false);
  const firstCards = useRef(true);
  const [addingId, setAddingId] = useState<string | null>(null); // in-flight lock ของ + Add to plan
  const [sendingImport, setSendingImport] = useState(false); // gn-rise เฉพาะโหลดแรก — กันการ์ดวูบตอนเปลี่ยน filter/intent

  const [hlVenueId, setHlVenueId] = useState<string | null>(null); // การ์ดที่ถูกชี้จาก chat

  // return-visit memory moment — "ทริปล่าสุดของคุณ" การ์ดเงียบๆ เหนือ mood tiles (ข้อมูลมาจาก MeProvider ที่แชร์กับ Shell, T2.1)
  const { me } = useMe();
  const [memoryDismissedId, setMemoryDismissedId] = useState<string | null>(null);

  const showToast = useToast();

  // saved venues รีเซ็ตจาก savedIds ทุกครั้งที่โหลดผลลัพธ์ใหม่สำเร็จ — เดิมอยู่ inline ใน load()
  // ย้ายมาฟังผ่าน onLoaded (T1.7) แทน เพื่อให้ setData/setSaved อยู่ batch เดียวกันเหมือนเดิม
  useEffect(() => {
    onLoaded((d) => setSaved(new Set(d.savedIds)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply ChatActions เข้า state จริงของ planner — ใช้ร่วมกันทั้งข้อความจาก AI และ follow-up chips
  const applyChatActions = (a: ChatActions): { applied: string[]; refetch: boolean } => {
    const applied: string[] = [];
    let refetch = false;
    if (a.intent && a.intent !== intent) {
      setIntent(a.intent);
      applied.push(INTENTS.find((i) => i.key === a.intent)?.label ?? a.intent);
      refetch = true;
    }
    if (a.origin && a.origin !== origin) {
      setOrigin(a.origin);
      applied.push(`from ${data?.zones.find((z) => z.id === a.origin)?.name_th ?? a.origin}`);
      refetch = true;
    }
    if (typeof a.budget === "number" && a.budget !== budget) {
      setBudget(a.budget);
      applied.push(`${a.budget}฿ budget`);
    }
    if (a.filters) {
      const next = { ...filters };
      for (const c of FILTER_CHIPS) {
        const v = a.filters[c.key];
        if (v === true) next[c.key] = true;
        else if (v === false && next[c.key]) {
          delete next[c.key];
          applied.push(`${c.label} off`);
        }
        if (v === true && !filters[c.key]) applied.push(c.label);
      }
      if (JSON.stringify(next) !== JSON.stringify(filters)) {
        setFilters(next);
        refetch = true;
      }
    }
    return { applied, refetch };
  };

  // กดชื่อร้านใน chat → เลื่อนไปการ์ดจริงกลางจอ + ไฮไลต์
  const highlightVenue = (id: string) => {
    setHlVenueId(id);
    document.querySelector(`[data-vid="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHlVenueId((cur) => (cur === id ? null : cur)), 2600);
  };

  useEffect(() => {
    if (data && firstCards.current) {
      const t = setTimeout(() => (firstCards.current = false), 900); // หลัง entrance ชุดแรกจบ
      return () => clearTimeout(t);
    }
  }, [data]);

  // อ่าน dismiss flag จาก localStorage ครั้งเดียวตอน mount (ไม่เกี่ยวกับ /api/me — คนละแหล่งข้อมูล)
  useEffect(() => {
    try {
      setMemoryDismissedId(localStorage.getItem("gn_memory_dismissed"));
    } catch {}
  }, []);

  // ทริปล่าสุด (ถ้าจบแล้ว + ภายใน 7 วัน) จาก me.plans — เดิมยิง /api/me เองอีกครั้ง (ซ้ำกับ Shell) เปลี่ยนมาใช้ context ที่ MeProvider โหลดไว้แล้ว (T2.1)
  const lastDonePlan = useMemo<ExpandedPlan | null>(() => {
    const mostRecent = me?.plans[0];
    if (!mostRecent || mostRecent.status !== "done") return null;
    const ageMs = Date.now() - new Date(mostRecent.created_at).getTime();
    return ageMs <= 7 * 24 * 60 * 60 * 1000 ? mostRecent : null;
  }, [me]);

  const dismissMemory = (id: string) => {
    try {
      localStorage.setItem("gn_memory_dismissed", id);
    } catch {}
    setMemoryDismissedId(id);
  };

  // trip ค้าง active (Task 2.3) — จาก me.plans เดียวกับที่ใช้หา lastDonePlan ด้านบน
  // มีไว้เตือนผู้ใช้ที่ทิ้งทริปกลางทาง ไม่ให้ลืมว่ามีทริปค้างอยู่
  const activePlan = useMemo<ExpandedPlan | null>(() => me?.plans.find((p) => p.status === "active") ?? null, [me]);

  // onboarding redirect (plan §3) — เฉพาะตอนไม่มี query param ใดๆ เลย (add/intent/origin/budget)
  // และยังไม่เคยทำ onboarding มาก่อน · เช็คครั้งเดียวตอน mount
  useEffect(() => {
    try {
      const hasAnyQuery = sp.get("add") || sp.get("intent") || sp.get("origin") || sp.get("budget") || sp.get("q");
      if (!hasAnyQuery && localStorage.getItem("gn_onboarded") !== "1") {
        router.replace("/app/welcome");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { act, acting, lastError } = usePlan(plan, setPlan); // in-flight lock ต่อ action มาจาก hook กลาง (T1.4)

  // (5) fly-to-plan — เงาการ์ดลอยเข้าคอลัมน์งบ (WAAPI, ไม่มี dependency)
  const flyToBudget = (fromEl?: HTMLElement | null) => {
    if (!fromEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = document.getElementById("gn-budget-target");
    if (!target) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${Math.min(a.height, 128)}px;border-radius:16px;z-index:150;pointer-events:none;opacity:.9;background:linear-gradient(150deg,#d9f0ea,#a8c9ee);box-shadow:0 18px 44px rgba(18,20,17,.18)`;
    document.body.appendChild(ghost);
    ghost
      .animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 0.9 },
          {
            transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - Math.min(a.height, 128) / 2}px) scale(0.05)`,
            opacity: 0.35,
          },
        ],
        { duration: 650, easing: "cubic-bezier(.32,.72,0,1)" },
      )
      .onfinish = () => ghost.remove();
  };

  const addToPlan = useCallback(
    async (venueId: string, venueName: string, cardEl?: HTMLElement | null) => {
      if (addingId) return; // กันกดรัว — stop ซ้ำคือบั๊กจริง
      setAddingId(venueId);
      flyToBudget(cardEl);
      if (plan) {
        try {
          const p = await act("add_stop", { venue_id: venueId });
          if (!p) return; // PATCH พัง — เงียบเหมือนเดิม (ก่อนหน้านี้ throw แล้วข้าม track+toast)
          track("add_stop", { venue_id: venueId, via: "card" });
          showToast(`Added ${venueName} to your plan`);
        } finally {
          setAddingId(null);
        }
        return;
      }
      try {
        track("add_stop", { venue_id: venueId });
        const p = await gn<ExpandedPlan>("/api/plans", {
          method: "POST",
          body: JSON.stringify({ intent, origin, venue_id: venueId, budget }),
        });
        setPlan(p);
        showToast(`Plan created with ${venueName}`);
      } catch {
        showToast("Couldn't create the plan — try again");
      } finally {
        setAddingId(null);
      }
    },
    [plan, act, intent, origin, budget, addingId],
  );

  // มาจาก "วางแผนไป" ใน S5 (?add=<venueId>) → สร้างแผนด้วยที่นั้นทันที
  useEffect(() => {
    const addId = sp.get("add");
    if (!addId || autoAdded.current || plan) return;
    autoAdded.current = true;
    (async () => {
      await addToPlan(addId, "your saved spot");
      router.replace("/app");
    })();
  }, [sp, plan, addToPlan, router]);

  const toggleSave = useCallback(
    async (venue: Venue) => {
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
        showToast("Couldn't save");
      }
    },
    [showToast],
  );

  // route toggle (cheapest ⇄ fastest) บนการ์ด — track อย่างเดียว ไม่มี state อื่นแตะ
  const handleToggleRoute = useCallback((venueId: string, kind: "cheapest" | "fastest") => {
    track("route_alt_toggle", { venue_id: venueId, kind, screen: "planner" });
  }, []);

  const submitImport = async () => {
    if (!importUrl.trim() || sendingImport) return;
    setSendingImport(true);
    try {
      await gn("/api/imports", { method: "POST", body: JSON.stringify({ url: importUrl.trim() }) });
      setImportUrl("");
      showToast("Link received 🎬 Our team pulls the data within 24h — track it in My trips");
    } catch (e) {
      showToast(e instanceof Error ? e.message.replace(/^\d+: /, "") : "Couldn't send the link");
    } finally {
      setSendingImport(false);
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

  // hooks ต้องมาก่อน early return ทุกตัว
  const spent = plan?.spent ?? 0;
  const left = budget - spent;
  const spentAnim = useCountUp(spent);
  const leftAnim = useCountUp(Math.abs(left));

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">📡</p>
        <p className="mt-3 font-bold text-ink">Couldn't load data</p>
        <p className="mt-1 text-sm text-mut">Check your connection and retry</p>
        <button onClick={reload} className="gn-press gn-cta o-pill-primary o-btn-label mt-4 px-6 py-2.5">
          Try again ↻
        </button>
      </div>
    );
  }
  if (!data) return <LoadingSkeleton />;

  const list = showMore ? [...data.cards, ...data.more] : data.cards;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const originName = data.zones.find((z) => z.id === origin)?.name_th ?? "Other";
  const intentLabel = INTENTS.find((i) => i.key === intent)!.label;
  const rain = data.weather;
  const showRain = rain?.rainExpected && !rainDismissed;
  const activeFilters = FILTER_CHIPS.filter((c) => filters[c.key]);
  // base สำหรับ split-pay = ตัวเลขจริงที่โชว์อยู่ในกล่องงบ (plan §1)
  const splitBase = plan ? (plan.status === "draft" ? plan.est_total : plan.spent) : spent;

  // โชว์การ์ดความทรงจำเฉพาะตอนไม่มีแผน active + ยังไม่เคยปิดทริปนี้ทิ้ง
  const showMemory = !plan && lastDonePlan !== null && lastDonePlan.id !== memoryDismissedId;
  const memoryActual = lastDonePlan ? (lastDonePlan.budget_actual ?? lastDonePlan.spent) : 0;
  const memoryDiff = lastDonePlan ? lastDonePlan.budget_planned - memoryActual : 0;
  const memoryUnder = memoryDiff >= 0;

  const estOver = plan?.status === "draft" && plan.est_total > plan.budget_planned;

  // banner เตือนทริปค้าง active (Task 2.3) — ไม่โชว์ถ้า plan ที่กำลังดูอยู่ในคอลัมน์ 3 คือตัวเดียวกันอยู่แล้ว
  const showActiveBanner = activePlan !== null && activePlan.id !== plan?.id;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-4 lg:pb-4">
      {/* T3.2: heading เดียวของหน้าสำหรับ screen reader — ไม่กระทบหน้าตา (sr-only) */}
      <h1 className="sr-only">Plan your day</h1>

      {/* Trip ค้าง active — เตือนก่อนการ์ดความทรงจำ (ทรงเดียวกัน, ลอกคลาสมาจาก memory card ด้านล่าง) */}
      {showActiveBanner && activePlan && (
        <Link
          href={`/app/plan/${activePlan.id}`}
          className="gn-card-e gn-rise mb-4 flex items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-[13px] font-semibold text-ink">Continue your trip in progress →</span>
        </Link>
      )}

      {/* Return-visit memory moment — เงียบๆ แถวเดียว เหนือ mood tiles, เฉพาะทริปที่จบแล้วภายใน 7 วัน */}
      {showMemory && lastDonePlan && (
        <div className="gn-card-e gn-rise mb-4 flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[13px] text-ink">
            Last trip: <b className="gn-num">{memoryActual}฿</b> ·{" "}
            <b className={`gn-num ${memoryUnder ? "text-ok" : "text-bad"}`}>{Math.abs(memoryDiff)}฿</b>{" "}
            {memoryUnder ? "under budget ✓" : "over budget"}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <Link href="/app/me" className="o-btn-label text-[12.5px] font-semibold text-accent hover:underline">
              View →
            </Link>
            <button
              onClick={() => dismissMemory(lastDonePlan.id)}
              aria-label="Dismiss"
              className="gn-press p-1.5 text-mut hover:text-ink"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* Mood tiles — แทน hint bar เดิม: แตะเดียวตั้ง intent+filters+budget จริงแล้ว refetch (plan §1) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MOODS.map((m, i) => {
          const active = intent === m.key;
          return (
            <button
              key={m.key}
              onClick={() => pickMood(m)}
              aria-pressed={active}
              className={`o-grain gn-drift gn-rise gn-d${i + 1} gn-press relative flex min-h-[118px] flex-col justify-end gap-1 overflow-hidden rounded-[20px] border p-4 text-left transition-transform hover:-translate-y-1 ${m.ambience} ${
                active ? "border-ink" : "border-line"
              }`}
            >
              <span className="o-mono relative z-[2] text-[10px] text-ink/75">{m.timeframe}</span>
              <b className="relative z-[2] text-[17px] font-semibold text-ink">
                {m.emoji} {m.label}
              </b>
              <span className="relative z-[2] text-[12px] text-ink/80">{moodSubtitle(m)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[330px_1fr_360px]">
        {/* ====== col 2 (T2.8 — การตัดสินใจ Klao ข้อ 2): Top 3 + hero + intent chips ======
            ย้าย DOM จริงมาก่อน col 1 (ไม่ใช่แค่ CSS order) เพื่อให้ลำดับที่ screen reader / keyboard
            tab อ่านตรงกับสิ่งที่ตาเห็นบนมือถือ (การ์ดก่อนแชท) · desktop (lg+): lg:order-2 ดึงกลับไป
            คอลัมน์กลางเหมือนเดิมเป๊ะ (grid 330px/1fr/360px เดิมไม่เปลี่ยน) */}
        <section className="@container order-1 lg:order-2 gn-card-e gn-rise gn-d1 p-4">
          {/* T2.8 fix: ซ่อนเลขขั้นตอนบนมือถือ (< lg) เพราะ DOM order สลับจาก desktop (การ์ดมาก่อนเงื่อนไข)
              เลข 01/02/03 เลยไม่ตรงลำดับที่ตาเห็นอีกต่อไป — desktop (≥ lg) ยังเห็นเลขเหมือนเดิมทุกตัวอักษร */}
          <h2 className="gn-step"><span className="hidden lg:inline">02 — </span>Pick a spot · top {data.cards.length} of {data.total}</h2>

          <div
            className={`o-grain gn-shine relative mb-3 mt-2 h-[150px] overflow-hidden rounded-xl ${INTENT_AMBIENCE[intent]}`}
          >
            <div className="absolute bottom-3 left-4 z-[2] text-ink drop-shadow-md">
              <b className="o-serif text-[20px] font-medium">
                <em className="o-marker">{originName} → Siam</em>
              </b>
              <br />
              <span className="o-mono text-[10px] text-ink/85">
                {intentLabel} · {budget}฿ budget
              </span>
            </div>
          </div>

          {/* origin picker — หัวใจของ "รู้งบก่อนออกจากบ้าน" */}
          <div className="mb-3">
            <p className="o-mono mb-1.5 text-[10px] text-mut">📍 Starting from which zone?</p>
            <div className="flex flex-wrap gap-1.5">
              {data.zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => pickOrigin(z.id)}
                  aria-pressed={origin === z.id}
                  className={`gn-press rounded-full border px-3.5 py-2 text-xs ${
                    origin === z.id
                      ? "gn-boing border-pill bg-pill font-semibold text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {z.name_th}
                </button>
              ))}
              <button
                onClick={() => pickOrigin("other")}
                aria-pressed={origin === "other"}
                className={`gn-press rounded-full border px-3.5 py-2 text-xs ${
                  origin === "other"
                    ? "gn-boing border-pill bg-pill font-semibold text-bg"
                    : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                }`}
              >
                Other
              </button>
            </div>
            {data.routes.fallback && (
              <p className="mt-1.5 text-[11.5px] text-warn">
                ⚠️ Routes from this zone aren't validated yet — using the Grab formula for now
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
                  aria-pressed={on}
                  className={`gn-press rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-semibold ${
                    on
                      ? "gn-boing border-pill bg-pill text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>

          {/* Task 2.6: คู่เดียวกันของ combo นี้ยังไม่มี Unseen gem ที่ยืนยันแล้ว — บอกตรงๆ ก่อนโชว์การ์ด */}
          {data.unseenPoolEmpty && (
            <p className="mb-2 text-[12px] text-mut">
              No confirmed Unseen gem for this combo yet — showing our next best Hit.
            </p>
          )}

          {/* กริดการ์ด: จำนวนคอลัมน์ตามความกว้างจริงของ col2 (@container บน section) ไม่ใช่ viewport —
              lg:grid-cols-3 เดิมทำการ์ดเหลือ 66px ที่ 1024 (col2 ~270px แต่ฝืน 3 คอลัมน์)
              threshold 540/820 = การ์ดไม่มีวันแคบกว่า ~260px ที่เนื้อหาการ์ด (ชิปราคา+หัวใจ+ปุ่ม) ต้องการจริง */}
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-mut">
              Nothing matches every filter 😅 — try turning some off
            </div>
          ) : (
            <div className="grid gap-3 @[540px]:grid-cols-2 @[820px]:grid-cols-3">
              {list.map((v, i) => (
                <div
                  key={v.id}
                  data-vid={v.id}
                  className={`${firstCards.current ? `gn-rise ${i < 6 ? `gn-d${i + 1}` : ""}` : ""} ${hlVenueId === v.id ? "gn-chat-hl" : ""}`.trim() || undefined}
                >
                <VenueCard
                  venue={v}
                  cheapest={data.routes.cheapest}
                  fastest={data.routes.fastest}
                  saved={saved.has(v.id)}
                  onAdd={addToPlan}
                  adding={addingId === v.id}
                  onSave={toggleSave}
                  onToggleRoute={handleToggleRoute}
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
                See {data.more.length} more options ▾
              </button>
            </div>
          )}
        </section>

        {/* ====== col 1 (T2.8 — DOM ที่ 2 บนมือถือ): เงื่อนไข + แชท + ตัวกรอง + import ======
            desktop (lg+): lg:order-1 ดึงกลับไปคอลัมน์ซ้ายสุดเหมือนเดิม (grid เดิมไม่เปลี่ยน) */}
        <aside className="order-2 lg:order-1 gn-card-e gn-rise flex max-h-[calc(100vh-180px)] flex-col gap-2.5 overflow-auto p-4 gn-noscroll">
          {/* T2.8 fix: ซ่อนเลขขั้นตอนบนมือถือ (< lg) — เหตุผลเดียวกับ col2 ด้านบน (DOM order สลับจาก desktop) */}
          <h2 className="gn-step"><span className="hidden lg:inline">01 — </span>Your conditions</h2>

          <div className="flex flex-col gap-2.5">
            <div className="self-end rounded-2xl bg-card-solid px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
              {intent === "work"
                ? `Work session, leaving from ${originName}`
                : intent === "date"
                  ? `Date from ${originName}, ${budget}฿ budget`
                  : intent === "photo"
                    ? `Photo spots, ${budget}฿ budget`
                    : `Family day, ${budget}฿ budget`}
            </div>
            <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
              Picked <b>top {data.cards.length} of {data.total} spots</b>
              {activeFilters.length > 0 && (
                <span className="text-mut"> · filters: {activeFilters.map((c) => c.label).join(" · ")}</span>
              )}
              <div className="mt-2 divide-y divide-line rounded-lg border border-line bg-card-solid/40 p-2.5 text-[12.5px]">
                {data.routes.cheapest.legs.map((l) => (
                  <div key={l.seq} className="flex justify-between py-1 text-mut first:pt-0 last:pb-0">
                    <span>{l.detail_th}</span>
                    <span className="text-ink">{l.price_max > 0 ? (l.price_min === l.price_max ? `${l.price_min}฿` : `${l.price_min}-${l.price_max}฿`) : "0฿"}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-baseline justify-between pt-2">
                  <span className="o-mono text-[10px] text-mut">
                    Trip there · {data.routes.cheapest.legs.reduce((s, l) => s + l.minutes, 0)} min
                  </span>
                  <span className="gn-num text-[22px] font-semibold text-ink">
                    {data.routes.cheapest.legs.reduce((s, l) => s + l.price_min, 0)}฿
                  </span>
                </div>
              </div>
            </div>
            {/* คำเตือนฝนจริงจาก Open-Meteo — ไม่มีข้อมูล = ไม่โชว์ */}
            {showRain && (
              <div className="gn-warn-banner px-3.5 py-2.5 text-[12.5px] text-warn">
                ☔ <b>Today's forecast:</b> {rain.maxProb}% rain chance
                {rain.peakHour !== null && ` around ${rain.peakHour}:00`}
                {!filters.indoor && (
                  <button
                    onClick={() => toggleFilter("indoor")}
                    className="gn-press ml-1.5 rounded-lg border border-warn/50 bg-bg px-2 py-0.5 text-[11.5px] font-bold text-warn"
                  >
                    Indoor only
                  </button>
                )}
                <button onClick={() => setRainDismissed(true)} className="ml-1.5 text-[11.5px] text-warn underline">
                  Hide
                </button>
              </div>
            )}

            {/* chat จริง — เจ้าของ state ทั้งหมดคือ ChatPanel (T1.7) พิมพ์แชทจึงไม่ re-render การ์ดฝั่งนี้
                T2.8: ChatPanel เองยุบ/ขยายตัวเองบนมือถือ < lg (default ยุบ, เปิดเองถ้ามี initialQuery) */}
            <ChatPanel
              intent={intent}
              origin={origin}
              budget={budget}
              filters={filters}
              data={data}
              loadError={loadError}
              onActions={applyChatActions}
              registerDataListener={onLoaded}
              highlightVenue={highlightVenue}
              initialQuery={sp.get("q")}
            />
          </div>

          {/* ตัวกรองจริง — กดแล้ว refetch ผลลัพธ์ */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_CHIPS.map((c) => {
              const on = !!filters[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => toggleFilter(c.key)}
                  aria-pressed={on}
                  className={`gn-press rounded-full border px-3.5 py-2.5 text-[13px] ${
                    on
                      ? "gn-boing border-pill bg-pill font-semibold text-bg"
                      : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-line bg-card-solid/40 p-3">
            <h4 className="o-mono mb-1.5 text-[11px] text-accent">📎 Found a spot on TikTok / IG?</h4>
            <div className="flex gap-1.5">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitImport()}
                placeholder="Paste the clip link here..."
                aria-label="TikTok or Instagram clip link"
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-mut"
              />
              <button
                onClick={submitImport}
                className="gn-press o-btn-label rounded-lg bg-accent px-3 py-1.5 text-[12.5px] text-bg"
               aria-busy={sendingImport}>
                {sendingImport ? <span className="gn-spinner" /> : null}Send
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-mut">Real humans pull the data within 24h — not a bot</p>
          </div>
        </aside>

        {/* ====== col 3 (DOM เดิม, ตำแหน่งไม่เปลี่ยน): plan + budget ====== */}
        <aside className="order-3 gn-card-e gn-rise gn-d2 p-4">
          {/* T2.8 fix: ซ่อนเลขขั้นตอนบนมือถือ (< lg) — เหตุผลเดียวกับ col2/col1 ด้านบน (DOM order สลับจาก desktop) */}
          <h2 className="gn-step"><span className="hidden lg:inline">03 — </span>Your plan + budget</h2>

          <div id="gn-budget-target" className="mt-2 mb-3 rounded-xl border border-line bg-card-solid/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="o-mono text-[10px] text-mut">Today's budget</span>
              {editingBudget ? (
                <input
                  type="number"
                  autoFocus
                  defaultValue={budget}
                  onBlur={(e) => editBudget(parseInt(e.target.value, 10))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  aria-label="New budget in baht"
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
                Spent <Odo value={spent} />฿ / {budget}฿
              </span>
            </div>
            <div key={spent} className={`gn-bump mt-1 text-xs font-semibold ${left < 0 ? "text-bad" : "text-ok"}`}>
              {left >= 0 ? `${leftAnim}฿ left` : `${leftAnim}฿ over ⚠️`}
            </div>
            <MoneyProgressBar pct={pct} tone={left < 0 ? "bad" : pct > 80 ? "warn" : "ok"} className="mt-2.5" />
            {/* est vs งบ ต้องเตือนตั้งแต่ตอน draft — ไม่ใช่รอให้เข้าไปเจอแถบแดงในหน้า plan */}
            {plan && plan.status === "draft" && (
              <div
                key={plan.est_total}
                className={`gn-bump mt-2 text-xs font-semibold ${plan.est_total > plan.budget_planned ? "text-bad" : "text-ok"}`}
              >
                {plan.est_total > plan.budget_planned
                  ? `⚠️ Est. ~${plan.est_total}฿ incl. transport — ${plan.est_total - plan.budget_planned}฿ over budget`
                  : `Est. ~${plan.est_total}฿ incl. transport — fits your budget ✓`}
              </div>
            )}
          </div>

          <SplitPay base={splitBase} />

          {plan ? (
            <>
              {/* ชื่อทริปอัตโนมัติ — ประกอบจากข้อมูลจริงของแผน */}
              <h4 className="o-serif mt-1 text-[15.5px] font-semibold leading-snug text-ink">
                {tripTitle(plan.intent, plan.origin_name, plan.budget_planned)}
              </h4>

              {/* timeline: เวลาเดินทาง = ตัวเลขจริงจาก route legs + walk_min ภาคสนาม · เวลาอยู่ต่อร้าน = ~ */}
              <StopTimelineList plan={plan} variant="interactive" />

              {plan.warnings.length > 0 && (
                <div className="gn-warn-banner mt-2 px-3 py-2 text-[12.5px] text-warn">
                  {plan.warnings.map((w) => (
                    <div key={w}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              {plan.remaining > 0 && (
                <div className="mt-3">
                  <h5 className="mb-1.5 text-[13px] font-bold text-ink">{plan.remaining}฿ left — keep the day going</h5>
                  <button
                    onClick={async () => {
                      try {
                        const list = await gn<Venue[]>(`/api/chain?planId=${plan.id}`);
                        setChainList(list);
                        track("chain_open", { plan_id: plan.id, count: list.length });
                      } catch {
                        showToast("Couldn't load suggestions");
                      }
                    }}
                    className="gn-press o-pill-dark o-btn-label w-full py-2 text-[12.5px]"
                  >
                    + Where next?
                  </button>
                </div>
              )}

              <button
                onClick={async () => {
                  const p = await act("start");
                  if (!p) {
                    // 409 already_active (Task 2.3) — มี trip ค้างอยู่ตัวอื่น บอก + พาไปทริปเดิมแทน
                    const body = lastError?.status === 409 ? (lastError.body as { activePlanId?: string } | undefined) : undefined;
                    if (body?.activePlanId) {
                      showToast("You already have a trip in progress");
                      router.push(`/app/plan/${body.activePlanId}`);
                    }
                    return; // PATCH พัง (กรณีอื่น) — เงียบเหมือนเดิม
                  }
                  track("plan_start_trip", { plan_id: plan.id });
                  router.push(`/app/plan/${plan.id}`);
                }}
                className="gn-press gn-cta gn-pulse-ring o-pill-primary o-btn-label mt-3 w-full py-3"
              >
                Start the trip ▶
              </button>

              {/* แชร์แผนเป็นลิงก์ view-only — เปิดได้โดยไม่ต้อง login, token กันเดา id */}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.origin + plan.share_path);
                    showToast("Share link copied 🔗 — anyone can view, no login");
                  } catch {
                    showToast("Couldn't copy — try again");
                  }
                  track("share_link_copy", { plan_id: plan.id });
                }}
                className="gn-press o-pill-dark o-btn-label mt-2 w-full py-2 text-[12.5px]"
              >
                🔗 Share this plan
              </button>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-mut">
              No plan yet — hit <b className="text-ink">+ Add to plan</b> on a card
            </div>
          )}

          <div className="mt-3 text-center text-[11.5px] text-mut">
            Estimated from each spot's price range + transport, with 10% headroom
          </div>
        </aside>
      </div>

      {/* งบติดจอบนมือถือ — หัวใจของแอปต้องไม่ต้อง scroll 3 จอถึงเห็น · แตะ = เลื่อนไปกล่องงบ
          portal ไป body เพราะ ancestor มี transform (gn-rise) ทำให้ position:fixed โดนจับเป็น local */}
      {createPortal(
        <button
          onClick={() => document.getElementById("gn-budget-target")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="gn-glass fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-2 rounded-full border border-line px-4 py-2.5 shadow-[0_4px_10px_rgba(18,20,17,.07),0_26px_56px_rgba(18,20,17,.14)] sm:bottom-3 lg:hidden"
          aria-label="Jump to budget"
        >
          <span className="o-mono text-[10px] text-mut">BUDGET</span>
          <span className="gn-num text-[14px] font-semibold text-ink">
            {spent}฿ / {budget}฿
            <span className={`ml-1.5 ${estOver || left < 0 ? "text-bad" : "text-ok"}`}>
              {estOver
                ? `· est ~${plan!.est_total}฿ over ⚠️`
                : left < 0
                  ? `· ${-left}฿ over ⚠️`
                  : `· ${left}฿ left`}
            </span>
          </span>
        </button>,
        document.body,
      )}

      {/* chain picker — เลือกแล้วเพิ่มเข้าแผนได้จริง */}
      {chainList && plan && (
        <VenueSuggestSheet
          title={`Next stop within budget (${plan.remaining}฿)`}
          list={chainList}
          adding={null}
          ariaLabel="Next stop suggestions"
          onAdd={async (v) => {
            const p = await act("add_stop", { venue_id: v.id });
            if (!p) return; // PATCH พัง — เงียบเหมือนเดิม (dialog เปิดค้างเหมือนเดิม)
            setChainList(null);
            showToast(`Added ${v.name_th} to your plan`);
          }}
          onClose={() => setChainList(null)}
        />
      )}
    </div>
  );
}
