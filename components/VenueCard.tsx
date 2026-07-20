"use client";
// การ์ดสถานที่ Top 3 (spec S2): บาทชิปมุมขวาบน · badge hit/unseen · attributes · trust badge
import { useState } from "react";
import { Car, Clock3, Plug, UtensilsCrossed, Wifi, Heart, Play } from "lucide-react";
import { mid } from "@/lib/costing";
import type { Route, Venue } from "@/lib/types";
import BahtChip from "./BahtChip";
import TrustBadge from "./TrustBadge";

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

const FOOD_LABELS = { meals: "มีข้าว", snacks: "ของว่าง", drinks: "เครื่องดื่ม" } as const;

export default function VenueCard({
  venue,
  cheapest,
  fastest,
  saved,
  onAdd,
  onSave,
  onToggleRoute,
}: {
  venue: Venue;
  cheapest: Route;
  fastest: Route;
  saved: boolean;
  onAdd: () => void;
  onSave: () => void;
  onToggleRoute?: (kind: "cheapest" | "fastest") => void;
}) {
  const [kind, setKind] = useState<"cheapest" | "fastest">("cheapest");
  const route = kind === "cheapest" ? cheapest : fastest;
  const a = venue.attributes;
  const priceMid = mid(venue.price_per_head_min, venue.price_per_head_max);

  const toggle = () => {
    const next = kind === "cheapest" ? "fastest" : "cheapest";
    setKind(next);
    onToggleRoute?.(next);
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-[#FDE9D7] to-[#F8BE8D] text-5xl">
        <span aria-hidden>{CATEGORY_EMOJI[venue.category]}</span>
        <BahtChip legs={route.legs} className="absolute right-2 top-2" />
        <button
          onClick={onSave}
          aria-label="บันทึกไว้"
          className={`absolute left-2 top-2 rounded-full bg-white/90 p-1.5 shadow ${saved ? "text-gn-red" : "text-gn-gray"}`}
        >
          <Heart size={16} fill={saved ? "currentColor" : "none"} />
        </button>
        <button
          onClick={toggle}
          className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs shadow"
          title="สลับเส้นทาง ประหยัด ⇄ เร็ว"
        >
          ⇄ {kind === "cheapest" ? "ดูแบบเร็ว" : "ดูแบบประหยัด"}
        </button>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-snug">{venue.name_th}</h3>
          {venue.badge === "hit" ? (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-gn-orange-dark">
              🔥 กำลังฮิต
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-gn-purple">
              💜 ที่ลับ verified
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gn-gray">
          {a.plugs !== "none" && (
            <span className="inline-flex items-center gap-1">
              <Plug size={13} /> ปลั๊ก{a.plugs === "all" ? "ทุกโต๊ะ" : "บางโต๊ะ"}
            </span>
          )}
          {a.wifi_mbps && (
            <span className="inline-flex items-center gap-1">
              <Wifi size={13} /> {a.wifi_mbps} Mbps
            </span>
          )}
          {a.seat_hours && (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} /> นั่งได้{a.seat_hours === 999 ? "ไม่จำกัด" : ` ${a.seat_hours} ชม.`}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <UtensilsCrossed size={13} /> {FOOD_LABELS[a.food_level]}
          </span>
          {a.parking && (
            <span className="inline-flex items-center gap-1">
              <Car size={13} /> ที่จอด
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">
            ~<b>{priceMid}฿</b>/คน · เดิน {venue.walk_min_from_hub} นาทีจาก BTS สยาม
          </span>
        </div>

        <TrustBadge lastValidatedAt={venue.last_validated_at} count={venue.validation_count} />

        <div className="flex gap-2 pt-1">
          <button
            onClick={onAdd}
            className="flex-1 rounded-full bg-gn-orange px-4 py-2 text-sm font-medium text-white hover:bg-gn-orange-dark"
          >
            + เพิ่มเข้าแผน
          </button>
          {venue.video_url && (
            <button className="inline-flex items-center gap-1 rounded-full border border-gn-navy/15 px-3 py-2 text-sm">
              <Play size={14} /> ดูคลิป
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
