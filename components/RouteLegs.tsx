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
  grab: "🚗",
};

const KIND_LABEL: Record<Route["kind"], string> = {
  cheapest: "ประหยัด",
  fastest: "เร็ว",
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
    <div className="rounded-2xl bg-gn-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <BahtChip legs={route.legs} />
        <span className="text-xs text-gn-gray">{minutesCur} นาที · เที่ยวเดียว</span>
      </div>
      <ol className="mb-3 space-y-1.5">
        {route.legs.map((l) => (
          <li key={l.seq} className="flex items-baseline gap-2 text-sm">
            <span>{MODE_EMOJI[l.mode] ?? "•"}</span>
            <span className="flex-1">
              <b>{MODE_LABELS[l.mode]}</b> — {l.detail_th}
              {l.warning_th && <span className="ml-1 text-xs text-gn-red">⚠ {l.warning_th}</span>}
            </span>
            <span className="text-gn-gray">
              {fmtRange(l.price_min, l.price_max)} · {l.minutes} นาที
            </span>
          </li>
        ))}
      </ol>
      {onToggle && (
        <button
          onClick={onToggle}
          className="w-full rounded-full border border-gn-navy/15 bg-gn-cream px-3 py-1.5 text-[13px] hover:border-gn-orange"
        >
          {KIND_LABEL[route.kind]} {fmtRange(cur.min, cur.max)} · {minutesCur} นาที{" "}
          <span className="mx-1 text-gn-orange">⇄</span>{" "}
          {KIND_LABEL[alt.kind]} {fmtRange(other.min, other.max)} · {minutesAlt} นาที
        </button>
      )}
    </div>
  );
}
