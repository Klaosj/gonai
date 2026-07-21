"use client";
// Confetti เขียว/฿ ยิงครั้งเดียวตอนจบทริป — CSS animation ล้วน unmount เองใน 2.8 วิ
// เคารพ prefers-reduced-motion (คลาสถูก kill ใน globals — เศษจะไม่ขยับ เลยไม่ render เลยดีกว่า)
import { useEffect, useMemo, useState } from "react";

const COLORS = ["#107f6b", "#41b982", "#0f9fa6", "#121411", "#6ccf63"];

export default function Confetti() {
  const [gone, setGone] = useState(false);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bits = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        // left+dx kept inset from the true edges (8-90% · ±24px) so bits never render past the
        // viewport on narrow screens — fixed-position elements poking past 100vw were pushing
        // document.documentElement.scrollWidth past clientWidth, causing a real (if transient,
        // ~2.8s) horizontal-scroll bug at mobile widths during the End-trip celebration
        left: `${8 + ((i * 37) % 83)}%`,
        dx: `${((i * 53) % 48) - 24}px`,
        rot: `${((i * 97) % 720) - 360}deg`,
        dur: `${1.6 + ((i * 13) % 10) / 10}s`,
        delay: `${((i * 7) % 40) / 100}s`,
        color: COLORS[i % COLORS.length],
        baht: i % 7 === 0,
      })),
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2800);
    return () => clearTimeout(t);
  }, []);

  if (gone || reduced) return null;
  return (
    <div aria-hidden>
      {bits.map((b, i) =>
        b.baht ? (
          <span
            key={i}
            className="gn-confetti-bit text-[14px] font-bold"
            style={{ left: b.left, color: b.color, "--dx": b.dx, "--rot": b.rot, "--dur": b.dur, "--delay": b.delay } as React.CSSProperties}
          >
            ฿
          </span>
        ) : (
          <span
            key={i}
            className="gn-confetti-bit h-[10px] w-[6px] rounded-[2px]"
            style={{ left: b.left, background: b.color, "--dx": b.dx, "--rot": b.rot, "--dur": b.dur, "--delay": b.delay } as React.CSSProperties}
          />
        ),
      )}
    </div>
  );
}
