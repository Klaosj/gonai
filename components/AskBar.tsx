"use client";
// Ask bar บน landing — เดิมเป็น Link หลอกไป /app เฉยๆ ตอนนี้พิมพ์ได้จริง:
// ข้อความถูกส่งต่อไป /app?q=... ให้ chat-to-plan ประมวลผลทันทีที่เข้าแอป
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/api";

export default function AskBar() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const go = () => {
    const q = value.trim();
    track("landing_ask", { hasText: q.length > 0 });
    router.push(q ? `/app?q=${encodeURIComponent(q)}` : "/app");
  };

  return (
    <div className="gn-press gn-rise gn-d1 o-grain mx-auto mt-10 flex max-w-lg items-center gap-3 rounded-full border border-line bg-bg px-5 py-3.5 text-left shadow-[0_2px_6px_rgba(18,20,17,.05),0_18px_44px_rgba(18,20,17,.1)] transition-shadow focus-within:shadow-[0_4px_10px_rgba(18,20,17,.07),0_26px_56px_rgba(18,20,17,.14)]">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Where to this Saturday, 450฿ budget…"
        aria-label="Tell us your plan"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-mut"
      />
      <button
        onClick={go}
        aria-label="Start planning"
        className="gn-pulse-ring gn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base text-white"
      >
        ↑
      </button>
    </div>
  );
}
