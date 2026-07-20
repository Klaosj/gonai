"use client";
// /app/welcome — onboarding 3 แตะ ข้ามได้ทุกขั้น (plan §3 · ต้นแบบ Gonai-onboarding.html)
// เขียนผลจริงลง localStorage เท่านั้น (gn_pref/gn_origin/gn_onboarded) — planner-client.tsx อ่านตอน init
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/api";
import { ZONES } from "@/lib/fixtures";

type Vibe = "quiet" | "loud" | "food" | "photo";

const VIBE_OPTIONS: { key: Vibe; emoji: string; label: string; desc: string }[] = [
  { key: "quiet", emoji: "🤫", label: "สายเงียบ", desc: "คาเฟ่เงียบ มุมส่วนตัว" },
  { key: "loud", emoji: "🎉", label: "สายคึกคัก", desc: "ตลาด อีเวนต์ คนเยอะได้" },
  { key: "food", emoji: "🍜", label: "สายกิน", desc: "ของอร่อยนำทาง" },
  { key: "photo", emoji: "📷", label: "สายรูป", desc: "แสงสวย มุมถ่ายรูป" },
];

const BUDGET_OPTIONS: { key: string; mul: number | undefined; emoji: string; label: string; desc: string }[] = [
  { key: "save", mul: 0.8, emoji: "🪙", label: "งบเซฟ", desc: "~300-500฿ / วัน" },
  { key: "mid", mul: 1, emoji: "⚖️", label: "กลางๆ", desc: "~500-900฿ / วัน" },
  { key: "full", mul: 1.3, emoji: "✨", label: "จัดเต็มบ้าง", desc: "~900-1,500฿ / วัน" },
  { key: "depends", mul: undefined, emoji: "🎲", label: "แล้วแต่วัน", desc: "ถามทุกครั้ง" },
];

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [budgetKey, setBudgetKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);

  const budgetMul = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.mul;

  const persist = (finalOrigin: string | null) => {
    try {
      const pref: { vibe?: Vibe; budgetMul?: number } = {};
      if (vibe) pref.vibe = vibe;
      if (typeof budgetMul === "number") pref.budgetMul = budgetMul;
      localStorage.setItem("gn_pref", JSON.stringify(pref));
      if (finalOrigin) localStorage.setItem("gn_origin", finalOrigin);
      localStorage.setItem("gn_onboarded", "1");
    } catch {}
  };

  const finish = () => {
    persist(origin);
    track("onboarding_done", {
      vibe: vibe ?? null,
      budgetMul: typeof budgetMul === "number" ? budgetMul : null,
      origin: origin ?? null,
    });
    router.replace("/app");
  };

  // "ข้ามทั้งหมด" = ไม่ตั้งค่าอะไรเลย ไม่ใช่แค่ข้ามขั้นที่เหลือ — ผลลัพธ์ต้องตรงกับสิ่งที่ปุ่มบอก
  const skipAll = () => {
    try {
      localStorage.setItem("gn_onboarded", "1");
    } catch {}
    track("onboarding_skip", {});
    router.replace("/app");
  };

  return (
    <div
      className="flex min-h-[calc(100vh-113px)] items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg, var(--bg) 40%, #1a2733 160%)" }}
    >
      <div className="w-full max-w-[560px]">
        <p className="o-mono mb-2.5 text-[11px] text-accent">GONAI — ตั้งค่า 3 แตะ (ข้ามได้ทุกขั้น)</p>
        <div className="mb-6 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-[3px] flex-1 rounded-full ${step >= n ? "bg-pill" : "bg-line"}`} />
          ))}
        </div>

        <div className="gn-card-e gn-rise p-8">
          {step === 1 && (
            <>
              <p className="o-mono text-[11px] text-mut">01 / 03</p>
              <h1 className="o-serif mt-2 text-[26px] font-semibold leading-tight text-ink">
                ปกติคุณเที่ยวแนว <em className="text-accent">ไหน?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">ใช้จัดลำดับ Top 3 ให้ตรงตั้งแต่ครั้งแรก — เปลี่ยนทีหลังได้</p>
              <div className="grid grid-cols-2 gap-3">
                {VIBE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setVibe(o.key)}
                    className={`gn-press rounded-2xl border p-4 text-left ${
                      vibe === o.key ? "border-pill bg-pill text-bg" : "border-line text-ink hover:border-ink/40"
                    }`}
                  >
                    <span className="mb-2 block text-2xl">{o.emoji}</span>
                    <b className="block text-[15px]">{o.label}</b>
                    <span className={`text-xs ${vibe === o.key ? "text-bg/70" : "text-mut"}`}>{o.desc}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={skipAll} className="o-mono gn-press text-[11px] text-mut hover:text-ink">
                  ข้ามทั้งหมด — ใช้เลย →
                </button>
                <button onClick={() => setStep(2)} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  ต่อไป →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="o-mono text-[11px] text-mut">02 / 03</p>
              <h1 className="o-serif mt-2 text-[26px] font-semibold leading-tight text-ink">
                สไตล์งบของ <em className="text-accent">คุณ?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">ตั้งงบตั้งต้นอัตโนมัติ — แก้ได้ทุกทริป</p>
              <div className="grid grid-cols-2 gap-3">
                {BUDGET_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setBudgetKey(o.key)}
                    className={`gn-press rounded-2xl border p-4 text-left ${
                      budgetKey === o.key ? "border-pill bg-pill text-bg" : "border-line text-ink hover:border-ink/40"
                    }`}
                  >
                    <span className="mb-2 block text-2xl">{o.emoji}</span>
                    <b className="block text-[15px]">{o.label}</b>
                    <span className={`text-xs ${budgetKey === o.key ? "text-bg/70" : "text-mut"}`}>{o.desc}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={skipAll} className="o-mono gn-press text-[11px] text-mut hover:text-ink">
                  ข้ามทั้งหมด — ใช้เลย →
                </button>
                <button onClick={() => setStep(3)} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  ต่อไป →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="o-mono text-[11px] text-mut">03 / 03</p>
              <h1 className="o-serif mt-2 text-[26px] font-semibold leading-tight text-ink">
                ออกจากย่าน <em className="text-accent">ไหนบ่อยสุด?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">คิดค่าเดินทางให้ถูกตั้งแต่เปิดแอป</p>
              <div className="grid grid-cols-2 gap-3">
                {ZONES.filter((z) => z.is_origin).map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setOrigin(z.id)}
                    className={`gn-press rounded-2xl border p-4 text-left ${
                      origin === z.id ? "border-pill bg-pill text-bg" : "border-line text-ink hover:border-ink/40"
                    }`}
                  >
                    <span className="mb-2 block text-2xl">🏠</span>
                    <b className="block text-[15px]">{z.name_th}</b>
                  </button>
                ))}
                <button
                  onClick={() => setOrigin("other")}
                  className={`gn-press rounded-2xl border p-4 text-left ${
                    origin === "other" ? "border-pill bg-pill text-bg" : "border-line text-ink hover:border-ink/40"
                  }`}
                >
                  <span className="mb-2 block text-2xl">📍</span>
                  <b className="block text-[15px]">อื่นๆ</b>
                </button>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={skipAll} className="o-mono gn-press text-[11px] text-mut hover:text-ink">
                  ข้ามทั้งหมด — ใช้เลย →
                </button>
                <button onClick={finish} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  เริ่มใช้ GoNai →
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11.5px] text-mut">
          🔒 เก็บไว้กับเราเท่านั้นตาม PDPA — ลบได้ทุกเมื่อในแท็บ ทริปของฉัน
        </p>
      </div>
    </div>
  );
}
