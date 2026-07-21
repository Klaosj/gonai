"use client";
// /app/welcome — onboarding 3 แตะ ข้ามได้ทุกขั้น (plan §3 · ต้นแบบ Gonai-onboarding.html)
// เขียนผลจริงลง localStorage เท่านั้น (gn_pref/gn_origin/gn_onboarded) — planner-client.tsx อ่านตอน init
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/api";
import { ZONES } from "@/lib/fixtures";

type Vibe = "quiet" | "loud" | "food" | "photo";

const VIBE_OPTIONS: { key: Vibe; emoji: string; label: string; desc: string }[] = [
  { key: "quiet", emoji: "🤫", label: "Quiet type", desc: "Calm cafes, private corners" },
  { key: "loud", emoji: "🎉", label: "Lively type", desc: "Markets, events, crowds are fine" },
  { key: "food", emoji: "🍜", label: "Foodie", desc: "Good food leads the way" },
  { key: "photo", emoji: "📷", label: "Photo hunter", desc: "Good light, good angles" },
];

const BUDGET_OPTIONS: { key: string; mul: number | undefined; emoji: string; label: string; desc: string }[] = [
  { key: "save", mul: 0.8, emoji: "🪙", label: "Saver", desc: "~300-500฿ / day" },
  { key: "mid", mul: 1, emoji: "⚖️", label: "Balanced", desc: "~500-900฿ / day" },
  { key: "full", mul: 1.3, emoji: "✨", label: "Treat myself", desc: "~900-1,500฿ / day" },
  { key: "depends", mul: undefined, emoji: "🎲", label: "Depends on the day", desc: "Ask me each time" },
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
        <p className="o-mono mb-2.5 text-[11px] text-accent">GONAI — 3-tap setup (skippable)</p>
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
                What's your usual <em className="text-accent">vibe?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">Helps rank your Top 3 right from day one — change it anytime</p>
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
                  Skip all — just use it →
                </button>
                <button onClick={() => setStep(2)} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  Next →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="o-mono text-[11px] text-mut">02 / 03</p>
              <h1 className="o-serif mt-2 text-[26px] font-semibold leading-tight text-ink">
                Your budget <em className="text-accent">style?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">Sets your default budget — editable every trip</p>
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
                  Skip all — just use it →
                </button>
                <button onClick={() => setStep(3)} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  Next →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="o-mono text-[11px] text-mut">03 / 03</p>
              <h1 className="o-serif mt-2 text-[26px] font-semibold leading-tight text-ink">
                Which zone do you <em className="text-accent">start from?</em>
              </h1>
              <p className="mb-5 mt-1 text-sm text-mut">So transport costs are right from the first screen</p>
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
                  <b className="block text-[15px]">Other</b>
                </button>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={skipAll} className="o-mono gn-press text-[11px] text-mut hover:text-ink">
                  Skip all — just use it →
                </button>
                <button onClick={finish} className="gn-press o-pill-primary o-btn-label px-7 py-3">
                  Start using GoNai →
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11.5px] text-mut">
          🔒 Stays with us only, PDPA compliant — delete anytime in My trips
        </p>
      </div>
    </div>
  );
}
