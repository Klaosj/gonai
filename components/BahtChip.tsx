// บาทชิป — ภาพจำอันดับ 2 ของแบรนด์ (spec 2.7): pill navy · ตัวเลขเงิน orange bold
import { fmtRange, routeCost } from "@/lib/costing";
import { MODE_LABELS, type RouteLeg } from "@/lib/types";

export default function BahtChip({ legs, className = "" }: { legs: RouteLeg[]; className?: string }) {
  const paid = legs.filter((l) => l.price_max > 0);
  const { min, max } = routeCost(legs);
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 rounded-full bg-gn-navy px-3 py-1 text-sm text-white shadow-md ${className}`}
    >
      {paid.length > 1 ? (
        <>
          {paid.map((l, i) => (
            <span key={l.seq}>
              {i > 0 && <span className="opacity-50">+ </span>}
              {MODE_LABELS[l.mode]}{" "}
              <b className="font-bold text-gn-orange">{fmtRange(l.price_min, l.price_max)}</b>
            </span>
          ))}
          <span className="opacity-50">=</span>
          <b className="font-bold text-gn-orange">{fmtRange(min, max)}</b>
        </>
      ) : (
        <span>
          {MODE_LABELS[paid[0]?.mode ?? "walk"]}{" "}
          <b className="font-bold text-gn-orange">{fmtRange(min, max)}</b>
        </span>
      )}
    </span>
  );
}
