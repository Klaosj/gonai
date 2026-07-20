"use client";
// /app/me — ประวัติ + สถิติ/Badge จากข้อมูลจริง + Taste profile + ที่บันทึกไว้ (plan §6 · ต้นแบบ Gonai triphistory.html)
// ใช้ /api/me จริง — ทุกตัวเลข/badge คำนวณจาก me.plans + me.priceConfirms เท่านั้น ไม่มีระบบแต้ม/รางวัลลอยๆ
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { gn } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { ExpandedPlan } from "@/lib/server";
import { INTENT_LABELS, type Intent, type Venue } from "@/lib/types";

interface MeResponse {
  saves: Venue[];
  plans: ExpandedPlan[];
  imports: { url: string; platform: string; status: string; created_at: string }[];
  taste: Record<string, number>;
  priceConfirms: number;
  auth: { provider: "line" | "anonymous"; displayName: string | null };
}

const IMPORT_STATUS_TH: Record<string, string> = {
  queued: "⏳ รอทีมงานดึงข้อมูล",
  processing: "🔎 กำลังดึงข้อมูล",
  done: "✅ เพิ่มเข้าระบบแล้ว",
  failed: "⚠️ ดึงไม่สำเร็จ",
};

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
};

const INTENT_EMOJI: Record<Intent, string> = {
  work: "💻",
  date: "💛",
  family: "👨‍👩‍👧",
  photo: "📷",
};

const INTENT_AMBIENCE: Record<Intent, string> = {
  work: "o-ambience-work",
  date: "o-ambience-date",
  family: "o-ambience-family",
  photo: "o-ambience-photo",
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
      label: "นักยืนยันราคา",
      earned: confirmEarned,
      detail: confirmEarned ? `confirm แล้ว ${priceConfirms} ราคา ✓` : `ยืนยันราคาให้ครบ 3 (ตอนนี้ ${priceConfirms})`,
    },
    {
      key: "checkin",
      emoji: "🧭",
      label: "ครบทุกเช็คอิน",
      earned: checkinEarned,
      detail: checkinEarned ? `ทริปเช็คอินครบ ${checkinTrips} ทริป ✓` : `ทริปเช็คอินครบทุกจุดให้ได้ 3 ทริป (ตอนนี้ ${checkinTrips})`,
    },
    {
      key: "unseen",
      emoji: "✨",
      label: "นักล่า Unseen",
      earned: unseenEarned,
      detail: unseenEarned ? `ไปที่ลับแล้ว ${unseenVisits} ครั้ง ✓` : `ไปที่ลับให้ครบ 3 (ตอนนี้ ${unseenVisits})`,
    },
    {
      key: "budget",
      emoji: "🎯",
      label: "งบเป๊ะ",
      earned: onBudgetEarned,
      detail: onBudgetEarned
        ? `ไม่เกินงบติดกัน ${onBudgetStreak} ทริป ✓`
        : `ไม่เกินงบติดกันให้ครบ 5 ทริป (ตอนนี้ ${onBudgetStreak})`,
    },
  ];
}

export default function TripsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const load = () => {
    setLoadError(false);
    gn<MeResponse>("/api/me").then(setMe).catch(() => setLoadError(true));
  };
  useEffect(load, []);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🎒</p>
        <p className="mt-3 font-bold text-ink">โหลดข้อมูลไม่สำเร็จ</p>
        <button onClick={load} className="gn-press o-pill-primary o-btn-label mt-4 px-6 py-2.5">
          ลองอีกครั้ง ↻
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
    showToast("ลบข้อมูลทั้งหมดเรียบร้อย — กลับสู่หน้าวางแผน");
    setTimeout(() => router.push("/app"), 800);
  };

  const logout = async () => {
    await gn("/api/auth/line/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step">🎒 ทริปของฉัน</span>
      <h1 className="o-serif mt-2 text-[22px] font-medium text-ink">ประวัติ + สิ่งที่แอปเรียนรู้จากคุณ</h1>
      <p className="mb-4 text-mut">
        ยิ่งเที่ยว ยิ่งแม่น — ทุกทริปที่จบ ทำให้คำแนะนำและงบประมาณของคุณแม่นขึ้น
      </p>

      {/* ===== แถวสถิติรวม ===== */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">ทริปทั้งหมด</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{donePlans.length}</b>
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">ใช้ไปทั้งหมด</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{totalSpent}฿</b>
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">แม่นเฉลี่ย</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{avgErrorPct === null ? "—" : `±${avgErrorPct}%`}</b>
          {avgErrorPct !== null && <small className="text-ok">ประเมิน vs จ่ายจริง</small>}
        </div>
        <div className="gn-card-e p-4">
          <span className="o-mono text-[10px] text-mut">ราคาที่ยืนยัน</span>
          <b className="gn-num mt-1.5 block text-[26px] font-bold text-ink">{me.priceConfirms}</b>
          {me.priceConfirms > 0 && <small className="text-ok">ช่วยเพื่อนนักเที่ยวแล้ว</small>}
        </div>
      </div>

      {/* ===== Badge + ที่ชอบไปซ้ำ ===== */}
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="gn-card-e p-4">
          <p className="o-mono mb-3 text-[10px] text-accent">Badge จากการช่วย validate</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {badges.map((b) => (
              <div
                key={b.key}
                className={`flex items-center gap-3 rounded-2xl border border-line p-3.5 ${b.earned ? "" : "opacity-45"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${
                    b.earned ? "border-accent bg-accent text-bg" : "border-line bg-card-solid text-ink"
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
            <p className="o-mono mb-2 text-[10px] text-mut">ที่ชอบไปซ้ำ</p>
            {favorites.map((f) => (
              <div key={f.venue.id} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px] last:border-b-0">
                <span>{CATEGORY_EMOJI[f.venue.category]}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{f.venue.name_th}</span>
                <span className="shrink-0 text-xs text-mut">ไป {f.count} ครั้ง</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3-col เดิม: profile | history | saved (mockup) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* profile */}
        <div className="gn-card-e p-4">
          <h4 className="font-semibold text-ink">🧬 Taste Profile ของคุณ</h4>
          <div className="mt-2.5 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-[7px] flex-1 rounded-full ${i < tasteLevel ? "bg-accent" : "bg-bg-elev"}`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-mut">
            ระดับ personalization: <b className="text-ink">{tasteLevel}/4</b> — อีก {Math.max(0, (4 - tasteLevel) * 2)} ทริปจะปลดล็อกคำแนะนำล่วงหน้า
            &quot;เสาร์นี้น่าจะชอบ...&quot;
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
            <div className="mt-3 text-sm text-mut">ยังไม่มี taste data — เริ่มวางแผนแรกเลย</div>
          )}

          {/* auth */}
          <div className="mt-3 rounded-xl border border-line bg-card-solid/60 p-3 text-sm">
            {me.auth.provider === "line" ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink">
                  💚 ล็อกอินด้วย LINE{me.auth.displayName ? `: ${me.auth.displayName}` : ""}
                </span>
                <button onClick={logout} className="shrink-0 text-xs font-semibold text-mut underline">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div>
                <a
                  href="/api/auth/line/login?return=/app/me"
                  className="o-btn-label inline-block rounded-full bg-[#06c755] px-3.5 py-1.5 text-xs text-white"
                >
                  ล็อกอินด้วย LINE
                </a>
                <p className="mt-1.5 text-xs text-mut">
                  เก็บแผน/ประวัติข้ามเครื่อง — ไม่ล็อกอินก็ใช้ได้ แต่ข้อมูลอยู่แค่เครื่องนี้
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-mut">
            🔒 ข้อมูลนี้อยู่กับเราเท่านั้น ไม่ขายให้ใคร ·{" "}
            <button onClick={() => setConfirmingWipe(true)} className="font-bold text-accent underline">
              ดู/ลบข้อมูลของฉัน (PDPA)
            </button>
          </div>

          {confirmingWipe && (
            <div className="mt-3 rounded-xl border border-bad/40 bg-bad/5 p-3">
              <p className="text-sm font-semibold text-bad">
                ลบข้อมูลทั้งหมดของคุณจริงไหม?
              </p>
              <p className="mt-1 text-xs text-mut">
                แผน / ประวัติ / ที่บันทึกไว้ จะหายทั้งหมด — กู้คืนไม่ได้
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={wipe}
                  className="gn-press o-btn-label rounded-full border border-bad bg-bad/10 px-3.5 py-1.5 text-xs text-bad"
                >
                  ยืนยันลบทั้งหมด
                </button>
                <button
                  onClick={() => setConfirmingWipe(false)}
                  className="gn-press o-pill-dark o-btn-label px-3.5 py-1.5 text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

        {/* history — อัพเกรดสไตล์แบบ mockup: thumbnail ambience + ยอด + ต่ำกว่า/เกินงบ (plan §6.4) */}
        <div>
          <h4 className="mb-2.5 font-semibold text-ink">📜 ทริปที่ผ่านมา</h4>
          {me.plans.length === 0 && (
            <p className="gn-card-e p-6 text-center text-sm text-mut">
              ยังไม่มีทริป — เริ่มวางแผนแรกเลย
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
                    {INTENT_LABELS[p.intent]} · {p.origin_name} → สยาม
                  </b>
                  <small className="text-mut">
                    {new Date(p.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} ·{" "}
                    {p.stops.length} ที่ ·{" "}
                    {p.status === "done" ? "จบทริปแล้ว" : p.status === "active" ? "กำลังเที่ยวอยู่" : "แผนร่าง"}
                  </small>
                </div>
                {p.status === "done" && (
                  <div className="shrink-0 text-right">
                    <b className="gn-num block text-[15px] text-ink">{p.budget_actual}฿</b>
                    <div className={`text-[11px] font-semibold ${diff > 0 ? "text-bad" : "text-ok"}`}>
                      {diff > 0 ? `เกินงบ ${diff}฿` : diff === 0 ? "ตรงงบเป๊ะ" : `ต่ำกว่างบ ${-diff}฿ ✓`}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* saved */}
        <div>
          <h4 className="mb-2.5 font-semibold text-ink">🔖 ที่บันทึกไว้ (จากคลิป + การ์ด)</h4>
          {me.saves.length === 0 && (
            <p className="gn-card-e p-6 text-center text-sm text-mut">
              ยังไม่มีที่บันทึกไว้ — กด ♥ บนการ์ด หรือส่งลิงก์ TikTok/IG มาให้เราหาที่ให้
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
                  ~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน ·{" "}
                  {v.badge === "hit" ? "🔥 Hit" : "✨ Unseen"}
                </small>
              </div>
              <button
                onClick={() => router.push(`/app?add=${v.id}`)}
                className="gn-press o-pill-dark o-btn-label shrink-0 px-2.5 py-1 text-xs"
              >
                วางแผนไป →
              </button>
            </div>
          ))}

          {/* ลิงก์คลิปที่ส่งมา — ปิด dead end เดิม (ส่งแล้วหายเงียบ) */}
          {me.imports.length > 0 && (
            <>
              <h4 className="mb-2.5 mt-5 font-semibold text-ink">🎬 คลิปที่ส่งให้ทีมงาน</h4>
              {me.imports.map((im) => (
                <div key={im.created_at + im.url} className="gn-card-e mb-2 p-2.5">
                  <div className="truncate text-[12.5px] text-ink">{im.url}</div>
                  <small className="text-mut">
                    {IMPORT_STATUS_TH[im.status] ?? im.status} ·{" "}
                    {new Date(im.created_at).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}
                  </small>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-card-solid px-5 py-2.5 text-[13px] text-ink">
          {toast}
        </div>
      )}
    </div>
  );
}
