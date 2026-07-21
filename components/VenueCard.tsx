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

const FOOD_LABELS = { meals: "Real meals", snacks: "Snacks", drinks: "Drinks" } as const;

export default function VenueCard({
  venue,
  cheapest,
  fastest,
  saved,
  onAdd,
  adding = false,
  onSave,
  onToggleRoute,
}: {
  venue: Venue;
  cheapest: Route;
  fastest: Route;
  saved: boolean;
  onAdd: (cardEl?: HTMLElement | null) => void;
  adding?: boolean;
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
    <div data-vcard className="gn-card-e gn-lift overflow-hidden">
      <div
        className={`o-grain gn-shine relative flex h-32 items-end justify-start overflow-hidden ${CATEGORY_AMBIENCE[venue.category]}`}
      >
        <span aria-hidden className="relative z-[2] m-3 text-[36px] leading-none drop-shadow">
          {CATEGORY_EMOJI[venue.category]}
        </span>
        <BahtChip legs={route.legs} className="absolute right-2 top-2 z-[2]" />
        <button
          onClick={onSave}
          aria-label="Save"
          className={`gn-press absolute left-2 top-2 z-[2] rounded-full bg-bg/70 p-1.5 backdrop-blur ${saved ? "text-bad" : "text-ink"}`}
        >
          <span className={`relative ${saved ? "gn-pop" : ""} inline-block`}>
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
            {saved && (
              <span className="gn-burst pointer-events-none absolute inset-0" aria-hidden>
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <i key={a} style={{ "--a": `${a}deg` } as React.CSSProperties} />
                ))}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={toggle}
          className="o-mono gn-press absolute bottom-2 right-2 z-[2] rounded-full bg-bg/70 px-2 py-1 text-[10px] text-ink backdrop-blur"
          title="Toggle route: cheapest ⇄ fastest"
        >
          ⇄ {kind === "cheapest" ? "See fastest" : "See cheapest"}
        </button>
      </div>

      <div className="space-y-2 p-4">
        <div>
          {venue.badge === "hit" ? (
            <span className="o-mono inline-block rounded-full bg-pill px-2 py-0.5 text-[10px] text-bg">
              {venue.hit_rank ? `HIT Nº${venue.hit_rank}` : "HIT"}
            </span>
          ) : (
            <span className="o-mono inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] text-bg">
              UNSEEN
            </span>
          )}
          <h3 className="mt-1.5 line-clamp-2 font-semibold leading-snug text-ink">{venue.name_th}</h3>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mut">
          {a.plugs !== "none" && (
            <span className="inline-flex items-center gap-1">
              <Plug size={13} /> Plugs {a.plugs === "all" ? "every table" : "some tables"}
            </span>
          )}
          {a.wifi_mbps && (
            <span className="inline-flex items-center gap-1">
              <Wifi size={13} /> {a.wifi_mbps} Mbps
            </span>
          )}
          {a.seat_hours && (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} /> Stay {a.seat_hours === 999 ? "unlimited" : `${a.seat_hours} hr`}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <UtensilsCrossed size={13} /> {FOOD_LABELS[a.food_level]}
          </span>
          {a.parking && (
            <span className="inline-flex items-center gap-1">
              <Car size={13} /> Parking
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-mut">
            ~<b className="gn-num text-[20px] font-semibold text-ink">{priceMid}฿</b>{" "}
            <span className="o-mono text-[10px] text-mut">/person</span>
            <span className="block text-[12.5px]">{venue.walk_min_from_hub} min walk from BTS Siam</span>
          </span>
        </div>

        <TrustBadge lastValidatedAt={venue.last_validated_at} count={venue.validation_count} />

        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => onAdd(e.currentTarget.closest("[data-vcard]") as HTMLElement | null)}
            aria-busy={adding}
            className={`gn-press gn-cta o-btn-label o-pill-primary flex-1 whitespace-nowrap px-3 py-2 text-sm ${adding ? "gn-busy" : ""}`}
          >
            {adding ? <><span className="gn-spinner" />Adding…</> : "+ Add to plan"}
          </button>
          {venue.video_url && (
            <button className="gn-press o-pill-dark o-btn-label inline-flex items-center gap-1 px-3 py-2 text-sm">
              <Play size={14} /> Watch clip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
