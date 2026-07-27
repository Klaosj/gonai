// Trust badge — social proof จากข้อมูล validate จริง (แก้ AI trust gap · stale ที่ 45 วันตาม Gap Fix D)
// 3 สถานะจาก lib/trust.ts: stale / unverified (count 0 — ห้ามโชว์ "Confirmed by 0") / confirmed
import { STALE_DAYS } from "@/lib/fixtures";
import { trustState } from "@/lib/trust";

export default function TrustBadge({ lastValidatedAt, count }: { lastValidatedAt: string; count: number }) {
  const state = trustState(lastValidatedAt, count, Date.now(), STALE_DAYS);

  if (state.kind === "stale") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid/60 px-2.5 py-1 text-[11px] text-mut">
        Last checked {state.days}d ago — reconfirming
      </span>
    );
  }

  if (state.kind === "unverified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid/60 px-2.5 py-1 text-[11px] text-mut">
        New spot — not traveler-confirmed yet
      </span>
    );
  }

  // วงกลม ✓ ซ้อนกันแทน avatar — เราไม่มีรูปผู้ใช้จริง เลยไม่แกล้งทำเป็นมี
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-tint px-2.5 py-1 text-[11.5px] font-semibold text-accent">
      <span className="flex -space-x-1.5" aria-hidden>
        {Array.from({ length: state.dots }).map((_, i) => (
          <span
            key={i}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-bg bg-accent text-[8px] text-bg"
            style={{ opacity: 1 - i * 0.25 }}
          >
            ✓
          </span>
        ))}
      </span>
      Confirmed by {count} traveler{count === 1 ? "" : "s"}
      <span className="font-normal text-accent/70">· {state.days}d ago</span>
    </span>
  );
}
