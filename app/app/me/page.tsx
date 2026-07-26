"use client";
// /app/me — ประวัติ + สถิติ/Badge จากข้อมูลจริง + Taste profile + ที่บันทึกไว้ (plan §6 · ต้นแบบ Gonai triphistory.html)
// ใช้ /api/me จริง — ทุกตัวเลข/badge คำนวณจาก me.plans + me.priceConfirms เท่านั้น ไม่มีระบบแต้ม/รางวัลลอยๆ
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { gn } from "@/lib/api";
import { mid } from "@/lib/costing";
import { useApiResource } from "@/lib/use-api-resource";
import { useToast } from "@/lib/use-toast";
import type { ExpandedPlan } from "@/lib/server";
import { INTENT_LABELS, type Venue } from "@/lib/types";
import { CATEGORY_AMBIENCE, CATEGORY_EMOJI, INTENT_AMBIENCE, INTENT_EMOJI } from "@/lib/venue-display";

interface MeResponse {
  saves: Venue[];
  plans: ExpandedPlan[];
  imports: { url: string; platform: string; status: string; created_at: string }[];
  taste: Record<string, number>;
  priceConfirms: number;
  auth: { provider: "line" | "anonymous"; displayName: string | null };
}

const IMPORT_STATUS_TH: Record<string, string> = {
  queued: "⏳ Waiting for the team",
  processing: "🔎 Being pulled",
  done: "✅ Added to the app",
  failed: "⚠️ Couldn't pull it",
};

interface Badge {
  key: string;
  emoji: string;
  label: string;
  earned: boolean;
  detail: string;
}

// badges ผูกกับการกระทำจริงในระบบทั้งหมด — ไม่มีแต้ม/ของรางวัลแลก มีแค่สถิติ (plan §6.2)
function computeBadges(donePlans: ExpandedPlan[], priceConfirms: number): Badge[] {
  const confirmEarned = priceConfirms >= 3;
  const checkinTrips = donePlans.filter((p) => p.stops.length > 0 && p.stops.every((s) => s.checked_in_at)).length;
  const checkinEarned = checkinTrips >= 3;
  const unseenVisits = donePlans.reduce((sum, p) => sum + p.stops.filter((s) => s.venue.badge === "unseen").length, 0);
  const unseenEarned = unseenVisits >= 3;
  // donePlans มาจาก me.plans ที่ store คืนใหม่→เก่าอยู่แล้ว — ไล่จากล่าสุดจนกว่าจะเจอทริปที่เกินงบ
  let onBudgetStreak = 0;
  for (const p of donePlans) {
    if ((p.budget_actual ?? 0) <= p.budget_planned) onBudgetStreak++;
    else break;
  }
  const onBudgetEarned = onBudgetStreak >= 5;

  return [
    {
      key: "confirm",
      emoji: "🧾",
      label: "Price confirmer",
      earned: confirmEarned,
      detail: confirmEarned ? `${priceConfirms} prices confirmed ✓` : `Confirm 3 prices (now ${priceConfirms})`,
    },
    {
      key: "checkin",
      emoji: "🧭",
      label: "Full check-in",
      earned: checkinEarned,
      detail: checkinEarned ? `${checkinTrips} fully checked-in trips ✓` : `Check in at every stop on 3 trips (now ${checkinTrips})`,
    },
    {
      key: "unseen",
      emoji: "✨",
      label: "Unseen hunter",
      earned: unseenEarned,
      detail: unseenEarned ? `${unseenVisits} hidden gems visited ✓` : `Visit 3 hidden gems (now ${unseenVisits})`,
    },
    {
      key: "budget",
      emoji: "🎯",
      label: "On budget",
      earned: onBudgetEarned,
      detail: onBudgetEarned
        ? `${onBudgetStreak} trips under budget in a row ✓`
        : `Stay under budget 5 trips in a row (now ${onBudgetStreak})`,
    },
  ];
}

export default function TripsPage() {
  const router = useRouter();
  const { data: me, error: loadError, reload: load } = useApiResource<MeResponse>("/api/me");
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const showToast = useToast();

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🎒</p>
        <p className="mt-3 font-bold text-ink">Couldn't load data</p>
        <button onClick={load} className="gn-press o-pill-primary o-btn-label mt-4 px-6 py-2.5">
          Try again ↻
        </button>
      </div>
    );
  }
  if (!me) return <LoadingSkeleton lines={4} />;

  const donePlans = me.plans.filter((p) => p.status === "done");
  const tasteEntries = Object.entries(me.taste);
  const tasteLevel = Math.min(4, Math.floor(donePlans.length / 2));

  // ===== สถิติรวม (plan §6.1) — คำนวณจาก me.plans + priceConfirms จริงเท่านั้น =====
  const totalSpent = donePlans.reduce((s, p) => s + (p.budget_actual ?? 0), 0);
  const accuracyPlans = donePlans.filter((p) => p.est_total > 0 && p.budget_actual !== null);
  const avgErrorPct =
    accuracyPlans.length > 0
      ? Math.round(
          (accuracyPlans.reduce((s, p) => s + Math.abs(p.est_total - (p.budget_actual ?? 0)) / p.est_total, 0) /
            accuracyPlans.length) *
            100,
        )
      : null;

  const badges = computeBadges(donePlans, me.priceConfirms);

  // ===== ที่ชอบไปซ้ำ (plan §6.3) — นับ venue ซ้ำจาก stops ของ done plans =====
  const venueCounts = new Map<string, { venue: Venue; count: number }>();
  for (const p of donePlans) {
    for (const s of p.stops) {
      const entry = venueCounts.get(s.venue.id);
      if (entry) entry.count++;
      else venueCounts.set(s.venue.id, { venue: s.venue, count: 1 });
    }
  }
  const favorites = [...venueCounts.values()]
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // in-app confirm (ไม่ใช้ window.confirm — บล็อค browser + ใช้กับ automation ไม่ได้)
  const wipe = async () => {
    await gn("/api/me", { method: "DELETE" });
    setConfirmingWipe(false);
    showToast("All your data is deleted — back to the planner");
    setTimeout(() => router.push("/app"), 800);
  };

  const logout = async () => {
    await gn("/api/auth/line/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step">🎒 My trips</span>
      <h1 className="o-serif mt-2 text-[22px] font-medium text-ink">History + what the app learned about you</h1>
      <p className="mb-4 text-mut">
        The more you go, the sharper it gets — every finished trip tunes your picks and budget
      </p>

      {/* ทริปที่กำลังเที่ยว — ทางกลับเข้า live mode ต้องเด่นสุดในหน้า ไม่ใช่จมอยู่ใน Past trips */}
      {me.plans
        .filter((p) => p.status === "active")
        .map((p) => (
          <Link
            key={p.id}
            href={`/app/plan/${p.id}`}
            className="gn-card-e gn-rise mb-4 flex items-center justify-between gap-3 border-accent/40 bg-tint/40 px-4 py-3.5"
          >
            <span className="flex items-center gap-2.5 text-[14px] text-ink">
              <span className="gn-live-dot" aria-hidden />
              <b>On the trip now</b> · {p.origin_name} → Siam · <span className="gn-num">{p.spent}฿ / {p.budget_planned}฿</span>
            </span>
            <span className="o-btn-label shrink-0 text-[12.5px] font-bold text-accent">Back to trip →</span>
          </Link>
        ))}

      {/* ===== แถวสถิติรวม ===== */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">Total trips</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{donePlans.length}</b>
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">Total spent</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{totalSpent}฿</b>
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">Avg accuracy</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{avgErrorPct === null ? "—" : `±${avgErrorPct}%`}</b>
          {avgErrorPct !== null && <small className="text-ok">estimate vs actual</small>}
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">Prices confirmed</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{me.priceConfirms}</b>
          {me.priceConfirms > 0 && <small className="text-ok">helping fellow travelers</small>}
        </div>
      </div>

      {/* ===== Badge + ที่ชอบไปซ้ำ ===== */}
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="gn-card-e p-4">
          <p className="o-mono mb-3 text-[10px] text-accent">Badges from helping validate</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {badges.map((b) => (
              <div
                key={b.key}
                className={`flex items-center gap-3 rounded-2xl border border-line p-3.5 ${b.earned ? "" : "opacity-45"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${
                    b.earned ? "border-accent bg-tint text-accent" : "border-line bg-card-solid text-ink"
                  }`}
                >
                  {b.emoji}
                </span>
                <div className="min-w-0">
                  <b className="block text-[13px] text-ink">{b.label}</b>
                  <span className="text-[11px] text-mut">{b.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {favorites.length > 0 && (
          <div className="gn-card-e p-4">
            <p className="o-mono mb-2 text-[10px] text-mut">Repeat favorites</p>
            {favorites.map((f) => (
              <div key={f.venue.id} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px] last:border-b-0">
                <span>{CATEGORY_EMOJI[f.venue.category]}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{f.venue.name_th}</span>
                <span className="shrink-0 text-xs text-mut">went {f.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3-col เดิม: profile | history | saved (mockup) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* profile */}
        <div className="gn-card-e p-4">
          <h4 className="font-semibold text-ink">🧬 Your Taste Profile</h4>
          <div className="mt-2.5 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-[7px] flex-1 rounded-full ${i < tasteLevel ? "bg-accent" : "bg-bg-elev"}`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-mut">
            Personalization level: <b className="text-ink">{tasteLevel}/4</b> — {Math.max(0, (4 - tasteLevel) * 2)} more trips unlock proactive picks
            &quot;This Saturday you might like...&quot;
          </div>

          {tasteEntries.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tasteEntries.map(([k, n]) => (
                <span
                  key={k}
                  className="o-mono rounded-full border border-line bg-card-solid px-3 py-1 text-[10px] text-accent"
                >
                  {k} × {n}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-mut">No taste data yet — plan your first trip</div>
          )}

          {/* auth */}
          <div className="mt-3 rounded-xl border border-line bg-card-solid/60 p-3 text-sm">
            {me.auth.provider === "line" ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink">
                  💚 Signed in with LINE{me.auth.displayName ? `: ${me.auth.displayName}` : ""}
                </span>
                <button onClick={logout} className="shrink-0 text-xs font-semibold text-mut underline">
                  Sign out
                </button>
              </div>
            ) : (
              <div>
                <a
                  href="/api/auth/line/login?return=/app/me"
                  className="o-btn-label inline-block rounded-full bg-[#06c755] px-3.5 py-1.5 text-xs text-white"
                >
                  Sign in with LINE
                </a>
                <p className="mt-1.5 text-xs text-mut">
                  Keep plans across devices — works without sign-in, but data stays on this device
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-mut">
            🔒 Your data stays with us, never sold ·{" "}
            <button onClick={() => setConfirmingWipe(true)} className="font-bold text-accent underline">
              View/delete my data (PDPA)
            </button>
          </div>

          {confirmingWipe && (
            <div className="mt-3 rounded-xl border border-bad/40 bg-bad/5 p-3">
              <p className="text-sm font-semibold text-bad">
                Really delete all your data?
              </p>
              <p className="mt-1 text-xs text-mut">
                Plans, history and saves will all be gone — no recovery
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={wipe}
                  className="gn-press o-btn-label rounded-full border border-bad bg-bad/10 px-3.5 py-1.5 text-xs text-bad"
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setConfirmingWipe(false)}
                  className="gn-press o-pill-dark o-btn-label px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* history — อัพเกรดสไตล์แบบ mockup: thumbnail ambience + ยอด + ต่ำกว่า/เกินงบ (plan §6.4) */}
        <div>
          <h4 className="mb-2.5 font-semibold text-ink">📜 Past trips</h4>
          {me.plans.length === 0 && (
            <p className="gn-card-e p-6 text-center text-sm text-mut">
              No trips yet — plan your first one
            </p>
          )}
          {me.plans.map((p) => {
            const diff = (p.budget_actual ?? 0) - p.budget_planned;
            return (
              <Link
                key={p.id}
                href={`/app/plan/${p.id}`}
                className="gn-card-e gn-lift mb-2.5 flex items-center gap-3 p-3"
              >
                <span className={`o-grain relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl text-lg ${INTENT_AMBIENCE[p.intent]}`}>
                  <span className="relative z-[2]">{INTENT_EMOJI[p.intent]}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] text-ink">
                    {INTENT_LABELS[p.intent]} · {p.origin_name} → Siam
                  </b>
                  <small className="text-mut">
                    {new Date(p.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })} ·{" "}
                    {p.stops.length} {p.stops.length === 1 ? "stop" : "stops"} ·{" "}
                    {p.status === "done" ? "done" : p.status === "active" ? "on the trip" : "draft"}
                  </small>
                </div>
                {p.status === "done" && (
                  <div className="shrink-0 text-right">
                    <b className="gn-num block text-[15px] text-ink">{p.budget_actual}฿</b>
                    <div className={`text-[11px] font-semibold ${diff > 0 ? "text-bad" : "text-ok"}`}>
                      {diff > 0 ? `${diff}฿ over` : diff === 0 ? "exactly on budget" : `${-diff}฿ under ✓`}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* saved */}
        <div>
          <h4 className="mb-2.5 font-semibold text-ink">🔖 Saved (from clips + cards)</h4>
          {me.saves.length === 0 && (
            <p className="gn-card-e p-6 text-center text-sm text-mut">
              Nothing saved yet — tap ♥ on a card, or send a TikTok/IG link and we'll find it
            </p>
          )}
          {me.saves.map((v) => (
            <div key={v.id} className="gn-card-e mb-2 flex items-center gap-2.5 p-2.5">
              <div className={`o-grain flex h-[46px] w-[58px] shrink-0 items-center justify-center rounded-lg text-xl ${CATEGORY_AMBIENCE[v.category]}`}>
                <span className="relative z-[2]">{CATEGORY_EMOJI[v.category]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{v.name_th}</div>
                <small className="text-mut">
                  ~{mid(v.price_per_head_min, v.price_per_head_max)}฿/person ·{" "}
                  {v.badge === "hit" ? "🔥 Hit" : "✨ Unseen"}
                </small>
              </div>
              <button
                onClick={() => router.push(`/app?add=${v.id}`)}
                className="gn-press o-pill-dark o-btn-label shrink-0 px-2.5 py-1 text-xs"
              >
                Plan a visit →
              </button>
            </div>
          ))}

          {/* ลิงก์คลิปที่ส่งมา — ปิด dead end เดิม (ส่งแล้วหายเงียบ) */}
          {me.imports.length > 0 && (
            <>
              <h4 className="mb-2.5 mt-5 font-semibold text-ink">🎬 Clips sent to the team</h4>
              {me.imports.map((im) => (
                <div key={im.created_at + im.url} className="gn-card-e mb-2 p-2.5">
                  <div className="truncate text-[12.5px] text-ink">{im.url}</div>
                  <small className="text-mut">
                    {IMPORT_STATUS_TH[im.status] ?? im.status} ·{" "}
                    {new Date(im.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                  </small>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
