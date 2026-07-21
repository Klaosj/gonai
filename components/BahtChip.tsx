// บาทชิป — ภาพจำอันดับ 2 ของแบรนด์: pill ขาวโปร่ง ตัว --accent mono
// บนการ์ดแคบ (หลาย legs + label อังกฤษยาว) ยุบเหลือ "ยอดรวม + จำนวนต่อ" กันล้นการ์ด
// รายละเอียดเต็มดูได้จาก title (hover) และ RouteLegs ในหน้าแผน
import { fmtRange, routeCost, bahtChipText } from "@/lib/costing";
import { MODE_LABELS, type RouteLeg } from "@/lib/types";

export default function BahtChip({ legs, className = "" }: { legs: RouteLeg[]; className?: string }) {
  const paid = legs.filter((l) => l.price_max > 0);
  const { min, max } = routeCost(legs);
  return (
    <span
      title={bahtChipText(legs)}
      className={`o-mono inline-flex items-center gap-x-1 whitespace-nowrap rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[10.5px] text-accent backdrop-blur-sm ${className}`}
    >
      {paid.length > 1 ? (
        <>
          <b className="font-semibold">{fmtRange(min, max)}</b>
          <span className="opacity-60">· {paid.length} rides</span>
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
