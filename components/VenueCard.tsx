"use client";
// การ์ดสถานที่ Top 3 (spec S2): บาทชิปมุมขวาบน · badge hit/unseen · attributes · trust badge
//
// กติกาไอคอน (T1.7): ไอคอน lucide (Plug/Wifi/Clock3/UtensilsCrossed/Car/Heart/Play) ในการ์ดนี้
// เป็น "ภาษา data icon" ของการ์ดร้านโดยเจตนา — ที่อื่นในแอปใช้ emoji ล้วน ห้ามเปลี่ยนการ์ดนี้ไปใช้
// emoji แทน และห้ามลาม lucide ไปหน้า/component อื่นที่ไม่ใช่การ์ดร้าน
//
// ครอบ React.memo (T1.7) เพื่อกัน re-render ทั้งกริดตอนพิมพ์ใน ChatPanel — onAdd/onSave/onToggleRoute
// เปลี่ยน signature ให้รับ venue id/name จาก VenueCard เอง (แทนที่ parent จะ inline closure ต่อการ์ด)
// เพื่อให้ PlannerClient ส่ง callback อ้างอิงเดียวที่เสถียร (useCallback) memo ถึงจะมีผลจริง
import { memo, useState } from "react";
import { Car, Clock3, Plug, UtensilsCrossed, Wifi, Heart, Play } from "lucide-react";
import { mid } from "@/lib/costing";
import type { Route, Venue } from "@/lib/types";
import { CATEGORY_AMBIENCE, CATEGORY_EMOJI } from "@/lib/venue-display";
import BahtChip from "./BahtChip";
import TrustBadge from "./TrustBadge";

const FOOD_LABELS = { meals: "Real meals", snacks: "Snacks", drinks: "Drinks" } as const;

function VenueCard({
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
  onAdd: (venueId: string, venueName: string, cardEl?: HTMLElement | null) => void;
  adding?: boolean;
  onSave: (venue: Venue) => void;
  onToggleRoute?: (venueId: string, kind: "cheapest" | "fastest") => void;
}) {
  const [kind, setKind] = useState<"cheapest" | "fastest">("cheapest");
  const route = kind === "cheapest" ? cheapest : fastest;
  const a = venue.attributes;
  const priceMid = mid(venue.price_per_head_min, venue.price_per_head_max);

  const toggle = () => {
    const next = kind === "cheapest" ? "fastest" : "cheapest";
    setKind(next);
    onToggleRoute?.(venue.id, next);
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
          onClick={() => onSave(venue)}
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
            onClick={(e) => onAdd(venue.id, venue.name_th, e.currentTarget.closest("[data-vcard]") as HTMLElement | null)}
            aria-busy={adding}
            className={`gn-press gn-cta o-btn-label o-pill-primary flex-1 whitespace-nowrap px-3 py-2 text-sm ${adding ? "gn-busy" : ""}`}
          >
            {adding ? <><span className="gn-spinner" />Adding…</> : "+ Add to plan"}
          </button>
          {venue.video_url && (
            <button
              onClick={() => window.open(venue.video_url!, "_blank", "noopener,noreferrer")}
              className="gn-press o-pill-dark o-btn-label inline-flex items-center gap-1 px-3 py-2 text-sm"
            >
              <Play size={14} /> Watch clip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(VenueCard);
