// เส้นทาง multi-modal + toggle ประหยัด ⇄ เร็ว (spec S3 / A8)
// mockup: "ประหยัด ~47฿ · 48 นาที ⇄ เร็ว ~200฿ · 35 นาที"
import { fmtRange, routeCost } from "@/lib/costing";
import { MODE_LABELS, type Route } from "@/lib/types";
import BahtChip from "./BahtChip";

const MODE_EMOJI: Record<string, string> = {
  walk: "🚶",
  win: "🛵",
  boat: "⛴️",
  bts: "🚈",
  mrt: "🚇",
  songthaew: "🛻",
  van: "🚐",
  bus: "🚌",
  grab: "🚗",
};

const KIND_LABEL: Record<Route["kind"], string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
};

export default function RouteLegs({
  route,
  alt,
  onToggle,
}: {
  route: Route;
  alt: Route;
  onToggle?: () => void;
}) {
  const cur = routeCost(route.legs);
  const other = routeCost(alt.legs);
  const minutesCur = cur.minutes;
  const minutesAlt = other.minutes;

  return (
    <div className="gn-card-e p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <BahtChip legs={route.legs} />
        <span className="text-xs text-mut">{minutesCur} min · one way</span>
      </div>
      <ol className="mb-3 divide-y divide-line">
        {route.legs.map((l) => (
          <li key={l.seq} className="flex items-baseline gap-2 py-1.5 text-sm first:pt-0 last:pb-0">
            <span>{MODE_EMOJI[l.mode] ?? "•"}</span>
            <span className="flex-1 text-ink">
              <b className="o-mono text-[11px] text-ink">{MODE_LABELS[l.mode]}</b> — {l.detail_th}
              {l.warning_th && <span className="ml-1 text-xs text-bad">⚠ {l.warning_th}</span>}
            </span>
            <span className="text-mut">
              {fmtRange(l.price_min, l.price_max)} · {l.minutes} min
            </span>
          </li>
        ))}
      </ol>
      {onToggle && (
        <button onClick={onToggle} className="gn-press o-pill-dark o-btn-label w-full px-3 py-1.5 text-[13px]">
          {KIND_LABEL[route.kind]} {fmtRange(cur.min, cur.max)} · {minutesCur} min{" "}
          <span className="mx-1 text-accent">⇄</span>{" "}
          {KIND_LABEL[alt.kind]} {fmtRange(other.min, other.max)} · {minutesAlt} min
        </button>
      )}
    </div>
  );
}
