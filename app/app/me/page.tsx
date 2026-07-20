"use client";
// /app/me — ประวัติ + Taste profile + ที่บันทึกไว้ (3-col mockup)
// ใช้ /api/me จริง
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { gn } from "@/lib/api";
import { mid } from "@/lib/costing";
import { clearDeviceId } from "@/lib/device";
import type { ExpandedPlan } from "@/lib/server";
import { INTENT_LABELS, type Venue } from "@/lib/types";

interface MeResponse {
  saves: Venue[];
  plans: ExpandedPlan[];
  taste: Record<string, number>;
}

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

export default function TripsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    gn<MeResponse>("/api/me").then(setMe).catch(() => {});
  }, []);

  if (!me) return <LoadingSkeleton lines={4} />;

  const donePlans = me.plans.filter((p) => p.status === "done");
  const tasteEntries = Object.entries(me.taste);
  const tasteLevel = Math.min(4, Math.floor(donePlans.length / 2));

  const wipe = async () => {
    if (!window.confirm("ลบข้อมูลทั้งหมดของคุณจริงไหม? แผน/ประวัติ/ที่บันทึกไว้จะหายทั้งหมด (กู้คืนไม่ได้)")) return;
    await gn("/api/me", { method: "DELETE" });
    clearDeviceId();
    showToast("ลบข้อมูลทั้งหมดเรียบร้อย — กลับสู่หน้าวางแผน");
    setTimeout(() => router.push("/app"), 800);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step gn-step-purple">🎒 ทริปของฉัน</span>
      <h1 className="gn-serif mt-2 text-[22px] font-extrabold">ประวัติ + สิ่งที่แอปเรียนรู้จากคุณ</h1>
      <p className="mb-4 text-gn-mut">
        ยิ่งเที่ยว ยิ่งแม่น — ทุกทริปที่จบ ทำให้คำแนะนำและงบประมาณของคุณแม่นขึ้น
      </p>

      {/* 3-col: profile | history | saved (mockup) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* profile */}
        <div className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <h4 className="font-bold">🧬 Taste Profile ของ Klao</h4>
          <div className="mt-2.5 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-[7px] flex-1 rounded-full ${i < tasteLevel ? "bg-gn-purple" : "bg-gn-cream"}`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-gn-mut">
            ระดับ personalization: <b>{tasteLevel}/4</b> — อีก {Math.max(0, (4 - tasteLevel) * 2)} ทริปจะปลดล็อกคำแนะนำล่วงหน้า
            &quot;เสาร์นี้น่าจะชอบ...&quot;
          </div>

          {tasteEntries.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tasteEntries.map(([k, n]) => (
                <span
                  key={k}
                  className="rounded-full border border-gn-pts-bd bg-gn-pts-bg px-3 py-1 text-xs font-semibold text-gn-pts-fg"
                >
                  {k} × {n}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gn-mut">ยังไม่มี taste data — เริ่มวางแผนแรกเลย</div>
          )}

          <div className="mt-3 text-xs text-gn-mut">
            🔒 ข้อมูลนี้อยู่กับเราเท่านั้น ไม่ขายให้ใคร ·{" "}
            <button onClick={wipe} className="font-bold text-gn-purple underline">
              ดู/ลบข้อมูลของฉัน (PDPA)
            </button>
          </div>
        </div>

        {/* history */}
        <div>
          <h4 className="mb-2.5 font-bold">📜 ทริปที่ผ่านมา</h4>
          {me.plans.length === 0 && (
            <p className="rounded-2xl border border-gn-line bg-gn-card p-6 text-center text-sm text-gn-mut">
              ยังไม่มีทริป — เริ่มวางแผนแรกเลย
            </p>
          )}
          {me.plans.map((p) => {
            const diff = (p.budget_actual ?? 0) - p.budget_planned;
            return (
              <div key={p.id} className="mb-2.5 rounded-xl border border-gn-line bg-gn-card p-3">
                <div className="flex justify-between font-bold">
                  <span>
                    {INTENT_LABELS[p.intent]} · {p.origin_name} → สยาม
                  </span>
                  {p.status === "done" && (
                    <span className={`text-xs font-extrabold ${diff > 0 ? "text-gn-red" : "text-gn-green-dark"}`}>
                      {diff > 0 ? `+${diff}฿ เกินแผน` : diff === 0 ? "ตรงแผน" : `${diff}฿ ต่ำกว่าแผน`}
                    </span>
                  )}
                </div>
                <small className="text-gn-mut">
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
          <h4 className="mb-2.5 font-bold">🔖 ที่บันทึกไว้ (จากคลิป + การ์ด)</h4>
          {me.saves.length === 0 && (
            <p className="rounded-2xl border border-gn-line bg-gn-card p-6 text-center text-sm text-gn-mut">
              ยังไม่มีที่บันทึกไว้ — กด ♥ บนการ์ด หรือส่งลิงก์ TikTok/IG มาให้เราหาที่ให้
            </p>
          )}
          {me.saves.map((v) => (
            <div key={v.id} className="mb-2 flex items-center gap-2.5 rounded-xl border border-gn-line bg-gn-card p-2.5">
              <div className="flex h-[46px] w-[58px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#d8ede4] to-[#efe9ff] text-xl">
                {CATEGORY_EMOJI[v.category]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{v.name_th}</div>
                <small className="text-gn-mut">
                  ~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน ·{" "}
                  {v.badge === "hit" ? "🔥 Hit" : "✨ Unseen"}
                </small>
              </div>
              <button
                onClick={() => showToast(`ใส่ในแผนเสาร์หน้าแล้ว: ${v.name_th}`)}
                className="shrink-0 rounded-lg border border-gn-navy/15 px-2.5 py-1 text-xs font-semibold hover:border-gn-orange hover:text-gn-orange"
              >
                วางแผนไป
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-gn-ink px-5 py-2.5 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
