"use client";
// /app/welcome — onboarding จอเดียว แบบ chat-first: พิมพ์แผนมาประโยคเดียว แล้วให้
// chat-to-plan ตั้งค่าให้ทั้งหมด (เดิมเป็น 3 จอถาม vibe/งบ/โซน — ซ้ำกับสิ่งที่ chat แปลเองได้แล้ว
// ประวัติ flow เก่าอยู่ใน git history) · ข้ามได้เสมอ ไม่บังคับกรอกอะไร
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/api";

// ตัวอย่างคือการสอนวิธีพูด — ครอบ intent/โซน/งบ/filter และโชว์ว่าพิมพ์ไทยได้
const EXAMPLES = [
  "💻 Work out of home, need plugs, 450฿",
  "💛 เดทเสาร์นี้จากลาดพร้าว งบ 500 ขอเงียบๆ",
  "👨‍👩‍👧 Family day from Bang Na, indoor, 1200฿",
];

export default function WelcomePage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const finish = (q: string | null) => {
    try {
      localStorage.setItem("gn_onboarded", "1");
    } catch {}
    if (q) {
      track("onboarding_done", { via: "chat" });
      router.replace(`/app?q=${encodeURIComponent(q)}`);
    } else {
      track("onboarding_skip", {});
      router.replace("/app");
    }
  };

  return (
    <div
      className="flex min-h-[calc(100vh-113px)] items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg, var(--bg) 40%, var(--tint) 160%)" }}
    >
      <div className="w-full max-w-[560px]">
        <p className="o-mono mb-2.5 text-[11px] text-accent">GONAI — ONE SENTENCE IS ENOUGH</p>

        <div className="gn-card-e gn-rise p-8">
          <h1 className="o-serif text-[22px] font-medium leading-tight text-ink">
            Tell me your day — <em className="o-marker">I&apos;ll price it</em>
          </h1>
          <p className="mb-5 mt-1.5 text-sm text-mut">
            Vibe, zone, budget — one sentence, Thai or English. Every number in the answer is real field data.
          </p>

          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && value.trim() && finish(value.trim())}
              placeholder='e.g. "quiet date from Lat Phrao, 500฿"'
              aria-label="Tell me your day"
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-3 text-[14.5px] text-ink placeholder:text-mut"
            />
            <button
              onClick={() => value.trim() && finish(value.trim())}
              aria-label="Start planning"
              className="gn-press gn-pulse-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-white"
            >
              ↑
            </button>
          </div>

          <p className="o-mono mb-2 mt-5 text-[10px] text-mut">OR TAP ONE TO TRY</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => finish(ex.replace(/^\S+\s/, ""))}
                className="gn-press rounded-2xl border border-line bg-bg px-4 py-3 text-left text-[13.5px] text-ink hover:border-ink/40"
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => finish(null)} className="o-mono gn-press text-[11px] text-mut hover:text-ink">
              Skip — just browse →
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-mut">
          🔒 Stays with us only, PDPA compliant — delete anytime in My trips
        </p>
      </div>
    </div>
  );
}
