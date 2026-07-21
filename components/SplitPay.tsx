"use client";
// SplitPay — คณิตล้วน ไม่มี backend/PromptPay (plan §1) · ใช้ร่วมกันระหว่าง planner + plan/[id]
// base = ตัวเลขจริงที่โชว์อยู่ในกล่องงบของแต่ละหน้าอยู่แล้ว (caller คำนวณส่งมา)
import { useEffect, useState } from "react";
import { track } from "@/lib/api";

export default function SplitPay({ base }: { base: number }) {
  const [n, setN] = useState(1);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem("gn_split_n") ?? "1", 10);
      if (saved >= 1 && saved <= 12) setN(saved);
    } catch {}
  }, []);

  const setCount = (next: number) => {
    const clamped = Math.max(1, Math.min(12, next));
    setN(clamped);
    try {
      localStorage.setItem("gn_split_n", String(clamped));
    } catch {}
    track("split_set", { n: clamped });
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="o-mono mb-2 text-[10px] text-accent">Split with friends</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCount(n - 1)}
            aria-label="Fewer people"
            className="gn-press flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-ink"
          >
            −
          </button>
          <b className="gn-num w-4 text-center text-[16px] text-ink">{n}</b>
          <button
            onClick={() => setCount(n + 1)}
            aria-label="More people"
            className="gn-press flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-ink"
          >
            +
          </button>
          <span className="text-xs text-mut">people</span>
        </div>
        {n >= 2 && (
          <div className="text-right">
            <div className="gn-num text-[18px] font-bold text-accent">~{Math.ceil(base / n)}฿ / person</div>
            <div className="text-[11px] text-mut">from {base}฿ total</div>
          </div>
        )}
      </div>
    </div>
  );
}
