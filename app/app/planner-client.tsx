"use client";
// /app — รวม S1 (intent/origin/budget) + S2 (Top3 + ดูเพิ่ม + import) ในหน้าเดียว
// 3-col grid (chat | Top3 | plan+budget) อ้างอิง painai-app-v3.html
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import VenueCard from "@/components/VenueCard";
import { gn, track } from "@/lib/api";
import { BUDGET_DEFAULTS, ZONES } from "@/lib/fixtures";
import { expandPlan, type ExpandedPlan } from "@/lib/server";
import type { Intent, Route, Venue } from "@/lib/types";

const INTENTS: { key: Intent | "food" | "nature"; label: string }[] = [
  { key: "work",   label: "💻 นั่งทำงาน" },
  { key: "date",   label: "💛 เดท" },
  { key: "photo",  label: "📷 ถ่ายรูป" },
  { key: "family", label: "👨‍👩‍👧 ครอบครัว" },
  { key: "food",   label: "🍜 กินของอร่อย" },
  { key: "nature", label: "🌿 ธรรมชาติ" },
];

const INTENT_MAP: Record<string, Intent> = {
  work: "work", date: "date", photo: "photo", family: "family",
};

interface VenuesResponse {
  cards: Venue[];
  more: Venue[];
  total: number;
  unseenPoolEmpty: boolean;
  savedIds: string[];
  routes: { cheapest: Route; fastest: Route; fallback: boolean };
}

const QUICK_REPLIES = [
  { label: "⏱ ขอใกล้กว่านี้", toast: "ปรับเป็นเดินทางไม่เกิน 40 นาที — อัปเดต Top 3 แล้ว" },
  { label: "🍚 ต้องมีข้าว", toast: "กรองเฉพาะร้านที่มีอาหารจริงจัง — อัปเดตแล้ว" },
  { label: "🎧 ต้องประชุมได้", toast: "เพิ่มเงื่อนไข: เงียบพอประชุม online ได้" },
];

export default function PlannerClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [intent, setIntent] = useState<string>(sp.get("intent") ?? "work");
  const [origin, setOrigin] = useState(sp.get("origin") ?? "bangkapi");
  const [budget, setBudget] = useState<number>(Number(sp.get("budget") ?? BUDGET_DEFAULTS[intent as Intent] ?? 800));
  const [editingBudget, setEditingBudget] = useState(false);

  const [data, setData] = useState<VenuesResponse | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [plan, setPlan] = useState<ExpandedPlan | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const apiIntent = INTENT_MAP[intent] ?? "work";
    gn<VenuesResponse>(`/api/venues?intent=${apiIntent}&origin=${origin}`)
      .then((d) => {
        setData(d);
        setSaved(new Set(d.savedIds));
        track("results_view", { intent: apiIntent, origin, total: d.total });
      })
      .catch(() => showToast("โหลดข้อมูลไม่สำเร็จ"));
  }, [intent, origin]);

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

  const addToPlan = async (venue: Venue) => {
    if (plan) {
      await act("add_stop", { venue_id: venue.id });
      track("add_stop", { venue_id: venue.id, via: "card" });
      showToast(`เพิ่ม ${venue.name_th} เข้าแผนแล้ว`);
      return;
    }
    try {
      const apiIntent = INTENT_MAP[intent] ?? "work";
      track("add_stop", { venue_id: venue.id });
      const { id } = await gn<{ id: string }>("/api/plans", {
        method: "POST",
        body: JSON.stringify({ intent: apiIntent, origin, venue_id: venue.id, budget }),
      });
      const p = await gn<ExpandedPlan>(`/api/plans/${id}`);
      setPlan(p);
      showToast(`สร้างแผน + เพิ่ม ${venue.name_th} แล้ว`);
    } catch {
      showToast("สร้างแผนไม่สำเร็จ");
    }
  };

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
      track("import_link", { url: importUrl.trim() });
      setImportUrl("");
      showToast("รับลิงก์แล้ว 🎬 ที่จากคลิปจะโผล่ใน 'ทริปของฉัน' ภายใน 24 ชม.");
    } catch {
      showToast("ส่งลิงก์ไม่สำเร็จ");
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

  if (!data) {
    return <LoadingSkeleton />;
  }

  const list = showMore ? [...data.cards, ...data.more] : data.cards;
  const spent = plan?.spent ?? 0;
  const left = budget - spent;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const originName = ZONES.find((z) => z.id === origin)?.name_th ?? origin;
  const intentLabel = INTENTS.find((i) => i.key === intent)?.label ?? "💻 นั่งทำงาน";

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      {/* 3-column planner grid */}
      <div className="grid gap-4 lg:grid-cols-[330px_1fr_360px]">
        {/* ====== col 1: chat + import ====== */}
        <aside className="flex max-h-[calc(100vh-180px)] flex-col gap-2.5 overflow-auto rounded-2xl border border-gn-line bg-gn-card p-4 gn-noscroll">
          <span className="gn-step gn-step-green">① คุยกับ AI</span>

          <div className="flex flex-col gap-2.5">
            <div className="self-end rounded-2xl bg-gn-chat-user px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
              {intent === "work"
                ? `อยากนั่งทำงาน ออกจาก${originName}`
                : intent === "date"
                  ? `เสาร์นี้เดท งบไม่เกิน ${budget}฿`
                  : intent === "photo"
                    ? "หาที่ถ่ายรูปสวยๆ"
                    : intent === "family"
                      ? `ไปกับครอบครัว งบ ${budget}฿`
                      : intent === "food"
                        ? "หาของอร่อยกิน"
                        : "หาที่ธรรมชาติ พักใจ"}
            </div>
            <div className="rounded-2xl border border-gn-chat-ai-bd bg-gn-chat-ai-bg px-3.5 py-2.5 text-[13.5px] leading-relaxed">
              รับทราบ 🙌 หาให้จากเงื่อนไขของคุณ — คัดมา <b>Top {data.cards.length} จาก {data.total} ที่</b>
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
            <div className="rounded-2xl border border-gn-amber-bd bg-gn-amber-bg px-3.5 py-2.5 text-[12.5px] text-gn-amber-fg">
              ☔ <b>เตือนไว้ก่อน:</b> บ่ายนี้ฝน 60% หลัง 17:00 — ผมเลี่ยงที่นั่ง outdoor ให้แล้ว
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q.label}
                onClick={() => showToast(q.toast)}
                className="rounded-full border border-gn-line bg-gn-card px-3 py-1.5 text-[12.5px] hover:border-gn-green hover:text-gn-green"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border-[1.5px] border-dashed border-gn-import-bd bg-gn-import-bg p-3">
            <h4 className="mb-1.5 text-[13px] font-bold text-gn-purple">📎 เห็นที่น่าไปจาก TikTok / IG?</h4>
            <div className="flex gap-1.5">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="วางลิงก์คลิปที่นี่..."
                className="min-w-0 flex-1 rounded-lg border border-gn-line px-2.5 py-1.5 text-[12.5px]"
              />
              <button
                onClick={submitImport}
                className="rounded-lg bg-gn-purple px-3 py-1.5 text-[12.5px] font-bold text-white"
              >
                ดึง
              </button>
            </div>
          </div>

          <div className="mt-auto flex gap-2">
            <input
              placeholder="พิมพ์คุยกับ AI..."
              className="min-w-0 flex-1 rounded-xl border border-gn-line px-3 py-2.5 text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  showToast("เดโม่: AI ตอบจาก data จริงในเวอร์ชันถัดไป");
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <button
              onClick={() => showToast("เดโม่: AI ตอบจาก data จริงในเวอร์ชันถัดไป")}
              className="rounded-xl bg-gn-green px-4 font-bold text-white"
            >
              ส่ง
            </button>
          </div>
        </aside>

        {/* ====== col 2: Top 3 + hero + intent chips ====== */}
        <section className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <span className="gn-step gn-step-orange">② เลือกสถานที่ — คัดมา {data.cards.length} จาก {data.total} ที่</span>

          {/* hero gradient (mockup-style) */}
          <div className="relative mb-3 mt-2 h-[150px] overflow-hidden rounded-xl bg-gradient-to-br from-gn-green to-gn-purple">
            <div className="absolute bottom-3 left-4 text-white drop-shadow-md">
              <b className="gn-serif text-[19px]">{originName} → สยาม</b>
              <br />
              <span className="text-xs opacity-90">{intentLabel} · งบ {budget}฿</span>
            </div>
          </div>

          {/* context chips */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-gn-line bg-gn-card px-3 py-1 text-xs text-gn-mut">
              📍 ออกจาก {originName}
            </span>
            <span className="rounded-full border border-gn-amber-cta-bd bg-gn-amber-cta-bg px-3 py-1 text-xs font-semibold text-gn-amber-cta">
              ☔ ฝน 60% หลัง 17:00
            </span>
            <span className="rounded-full border border-gn-line bg-gn-card px-3 py-1 text-xs text-gn-mut">
              🕙 ว่าง 10:00–20:00
            </span>
            <span className="rounded-full border border-gn-line bg-gn-card px-3 py-1 text-xs text-gn-mut">
              🔋 Taste: ชอบเงียบ · งบเฉลี่ย 350฿
            </span>
            {data.routes.fallback && (
              <span className="rounded-full border border-gn-amber-cta-bd bg-gn-amber-cta-bg px-3 py-1 text-xs font-semibold text-gn-amber-cta">
                ⚠️ เส้นทางยังไม่ validate
              </span>
            )}
          </div>

          {/* intent chips (6 ตัว ตาม mockup) */}
          <div className="mb-4 flex flex-wrap gap-2">
            {INTENTS.map((i) => {
              const on = intent === i.key;
              return (
                <button
                  key={i.key}
                  onClick={() => {
                    setIntent(i.key);
                    const apiIntent = INTENT_MAP[i.key];
                    if (apiIntent) {
                      setBudget(BUDGET_DEFAULTS[apiIntent]);
                      track("search", { intent: apiIntent, origin });
                    } else {
                      showToast(`${i.label} — อัปเดต Top 3 แล้ว`);
                    }
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

          {/* Top 3 cards grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <VenueCard
                key={v.id}
                venue={v}
                cheapest={data.routes.cheapest}
                fastest={data.routes.fastest}
                saved={saved.has(v.id)}
                onAdd={() => addToPlan(v)}
                onSave={() => toggleSave(v)}
                onToggleRoute={(kind) => track("route_alt_toggle", { venue_id: v.id, kind, screen: "planner" })}
              />
            ))}
          </div>

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

        {/* ====== col 3: plan + budget (mode toggle จะอยู่ใน /app/plan/[id] phase 2) ====== */}
        <aside className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <span className="gn-step gn-step-green">③ แผน + งบของคุณ</span>

          {/* budget box */}
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

          {/* plan timeline */}
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
                      const list = await gn<Venue[]>(`/api/chain?planId=${plan.id}`);
                      if (list.length === 0) {
                        const h = parseInt(
                          new Intl.DateTimeFormat("en-GB", {
                            timeZone: "Asia/Bangkok",
                            hour: "2-digit",
                            hour12: false,
                          }).format(new Date()),
                          10,
                        );
                        showToast(
                          h >= 22 || h < 8 ? "ที่ใกล้ๆ ปิดหมดแล้ว — ลองใหม่ช่วงเช้า" : "งบที่เหลือไม่พอสำหรับที่ใกล้ๆ",
                        );
                      } else {
                        showToast(`เจอ ${list.length} ที่ — เพิ่มจากการ์ดด้านกลาง`);
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
            ประเมินจากราคาจริงที่ผู้ใช้ยืนยัน · คลาดเคลื่อนเฉลี่ย ±11%
          </div>
        </aside>
      </div>

      {/* toast (mockup-style bottom center) */}
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
