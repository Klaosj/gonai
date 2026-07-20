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

// thumbnail ambience ต่อ category — คงไว้เป็น visual เท่านั้น ไม่ผูกกับ intent ของหน้า
// (VenueCard ไม่มี prop intent อยู่แล้ว เพื่อไม่ให้ต้องเพิ่ม prop ใหม่)
const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
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
    <div className="gn-card-e gn-lift overflow-hidden">
      <div
        className={`o-grain gn-shine relative flex h-32 items-end justify-start overflow-hidden ${CATEGORY_AMBIENCE[venue.category]}`}
      >
        <span aria-hidden className="relative z-[2] m-3 text-[36px] leading-none drop-shadow">
          {CATEGORY_EMOJI[venue.category]}
        </span>
        <BahtChip legs={route.legs} className="absolute right-2 top-2 z-[2]" />
        <button
          onClick={onSave}
          aria-label="บันทึกไว้"
          className={`gn-press absolute left-2 top-2 z-[2] rounded-full bg-bg/70 p-1.5 backdrop-blur ${saved ? "text-bad" : "text-ink"}`}
        >
          <span className={saved ? "gn-pop inline-block" : "inline-block"}>
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </span>
        </button>
        <button
          onClick={toggle}
          className="o-mono gn-press absolute bottom-2 right-2 z-[2] rounded-full bg-bg/70 px-2 py-1 text-[10px] text-ink backdrop-blur"
          title="สลับเส้นทาง ประหยัด ⇄ เร็ว"
        >
          ⇄ {kind === "cheapest" ? "ดูแบบเร็ว" : "ดูแบบประหยัด"}
        </button>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-ink">{venue.name_th}</h3>
          {venue.badge === "hit" ? (
            <span className="o-mono shrink-0 whitespace-nowrap rounded-full bg-pill px-2 py-0.5 text-[10px] text-bg">
              HIT Nº1
            </span>
          ) : (
            <span className="o-mono shrink-0 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] text-bg">
              UNSEEN
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mut">
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
          <span className="text-sm text-mut">
            ~<b className="gn-num text-[20px] font-semibold text-ink">{priceMid}฿</b>{" "}
            <span className="o-mono text-[10px] text-mut">/คน</span> · เดิน {venue.walk_min_from_hub} นาทีจาก BTS
            สยาม
          </span>
        </div>

        <TrustBadge lastValidatedAt={venue.last_validated_at} count={venue.validation_count} />

        <div className="flex gap-2 pt-1">
          <button
            onClick={onAdd}
            className="gn-press gn-cta o-btn-label o-pill-primary flex-1 px-4 py-2 text-sm"
          >
            + เพิ่มเข้าแผน
          </button>
          {venue.video_url && (
            <button className="gn-press o-pill-dark o-btn-label inline-flex items-center gap-1 px-3 py-2 text-sm">
              <Play size={14} /> ดูคลิป
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
