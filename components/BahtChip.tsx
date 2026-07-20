// บาทชิป — ภาพจำอันดับ 2 ของแบรนด์: pill มืดโปร่ง blur ตัว --accent mono (Origin style)
import { fmtRange, routeCost } from "@/lib/costing";
import { MODE_LABELS, type RouteLeg } from "@/lib/types";

export default function BahtChip({ legs, className = "" }: { legs: RouteLeg[]; className?: string }) {
  const paid = legs.filter((l) => l.price_max > 0);
  const { min, max } = routeCost(legs);
  return (
    <span
      className={`o-mono inline-flex flex-wrap items-center gap-x-1 rounded-full border border-line bg-bg/60 px-3 py-1 text-[11px] text-accent backdrop-blur-sm ${className}`}
    >
      {paid.length > 1 ? (
        <>
          {paid.map((l, i) => (
            <span key={l.seq}>
              {i > 0 && <span className="opacity-50">+ </span>}
              {MODE_LABELS[l.mode]}{" "}
              <b className="font-semibold">{fmtRange(l.price_min, l.price_max)}</b>
            </span>
          ))}
          <span className="opacity-50">=</span>
          <b className="font-semibold">{fmtRange(min, max)}</b>
        </>
      ) : (
        <span>
          {MODE_LABELS[paid[0]?.mode ?? "walk"]}{" "}
          <b className="font-semibold">{fmtRange(min, max)}</b>
        </span>
      )}
    </span>
  );
}
