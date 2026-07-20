"use client";
// /app/me — ประวัติ + Taste profile + ที่บันทึกไว้ (3-col mockup)
// ใช้ /api/me จริง
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { gn } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { ExpandedPlan } from "@/lib/server";
import { INTENT_LABELS, type Venue } from "@/lib/types";

interface MeResponse {
  saves: Venue[];
  plans: ExpandedPlan[];
  imports: { url: string; platform: string; status: string; created_at: string }[];
  taste: Record<string, number>;
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

      {/* 3-col: profile | history | saved (mockup) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* profile */}
        <div className="gn-card-e p-4">
          <h4 className="font-semibold text-ink">🧬 Taste Profile ของ Klao</h4>
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

        {/* history */}
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
              <div key={p.id} className="gn-card-e mb-2.5 p-3">
                <div className="flex justify-between font-semibold text-ink">
                  <span>
                    {INTENT_LABELS[p.intent]} · {p.origin_name} → สยาม
                  </span>
                  {p.status === "done" && (
                    <span className={`text-xs font-extrabold ${diff > 0 ? "text-bad" : "text-ok"}`}>
                      {diff > 0 ? `+${diff}฿ เกินแผน` : diff === 0 ? "ตรงแผน" : `${diff}฿ ต่ำกว่าแผน`}
                    </span>
                  )}
                </div>
                <small className="text-mut">
                  {new Date(p.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} ·{" "}
                  {p.status === "done"
                    ? `แผน ${p.est_total}฿ → จ่ายจริง ${p.budget_actual}฿`
                    : p.status === "active"
                      ? "กำลังเที่ยวอยู่"
                      : "แผนร่าง"}
                </small>
              </div>
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
