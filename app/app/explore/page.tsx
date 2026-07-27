"use client";
// /app/explore — ผังระยะเดินจาก BTS สยาม (ยังไม่ใช่แผนที่จริง) + grid ที่โชว์ได้ทั้งหมด + วิดีโอครีเอเตอร์ (plan §5)
// ต้นแบบ: Gonai explore.html — ปุ่ม "ส่งคลิปให้ทีมดึงที่เที่ยว" → เข้าคิว imports จริง (ไม่เปลี่ยน)
import Link from "next/link";
import { useMemo, useState } from "react";
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import { useApiResource } from "@/lib/use-api-resource";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useToast } from "@/lib/use-toast";
import type { Intent, Venue } from "@/lib/types";
import { CATEGORY_AMBIENCE, CATEGORY_EMOJI, INTENT_EMOJI } from "@/lib/venue-display";

const VIDEOS = [
  { id: "3_Fg14DzVhA", title: "5 Aesthetic Cafes in Bangkok — Relaxing Cafe Hopping", date: "Jan 2026", tag: "☕ 5 cafes in this clip" },
  { id: "Rn0ByVaJ6eo", title: "5 Days in Bangkok — local food, aesthetic cafes, hidden gems", date: "Latest", tag: "✨ Ari hidden gems inside" },
  { id: "OZrwLL-8hKc", title: "Bangkok Cafe Vlog — Chill Weekend Coffee & Brunch", date: "Mar 2025", tag: "🥐 5 brunch spots" },
  { id: "foQ0VfRdBH8", title: "Best Coffee Shops — Nana Coffee Roasters & more", date: "Jul 2025", tag: "☕ Serious coffee" },
  { id: "rjXAYlkpURE", title: "Bangkok Guide: 5 Must-Dos, Hidden Gems & Tourist Traps", date: "Aug 2025", tag: "⚠️ Skip the tourist traps" },
  { id: "nFTdc4OW1dc", title: "Bangkok Travel Guide 2025 — markets, food, Siam Square", date: "Jan 2026", tag: "🇹🇭 A visitor's view" },
];

type FilterKey = "all" | "unseen" | Intent | "cheap";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "✨ All" },
  { key: "unseen", label: "💜 Unseen only" },
  { key: "work", label: "💻 Work" },
  { key: "date", label: "💛 Date" },
  { key: "family", label: "👨‍👩‍👧 Family" },
  { key: "photo", label: "📷 Photo" },
  { key: "cheap", label: "🪙 ≤150฿" },
];

function matchesFilter(v: Venue, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "unseen") return v.badge === "unseen";
  if (f === "cheap") return v.price_per_head_min <= 150;
  return v.intents.includes(f);
}

// attribute เด่นหนึ่งอย่างต่อที่ — มาจาก data จริงเท่านั้น ไม่ใช่ copy ลอย
function standoutAttribute(v: Venue): string {
  const a = v.attributes;
  if (a.plugs === "all") return "plugs every table";
  if (a.plugs === "some") return "has plugs";
  if (a.noise === "quiet") return "quiet, call-friendly";
  if (a.food_level === "meals") return "real meals";
  if (a.parking) return "parking";
  if (a.indoor) return "indoor";
  return `${v.walk_min_from_hub} min walk`;
}

// hash → มุมคงที่ต่อ venue id (deterministic, SSR-safe — ห้ามสุ่ม)
function hashAngleDeg(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

// รัศมี (% จากจุดกลาง) ตามเวลาเดิน — ใช้ค่าเดียวกันทั้งวงแหวนอ้างอิงและ pin จริง
function radiusPctForWalk(walkMin: number): number {
  const w = Math.min(15, Math.max(1, walkMin));
  return 12 + (w / 15) * 34; // 12%..46% จากจุดกลาง
}

// มุม: แจกช่องเท่าๆ กันตาม index (การันตีระยะห่าง label) + jitter เล็กจาก hash — มุมเป็นแค่การจัดวาง
// ระยะจากศูนย์กลางเท่านั้นที่เป็นข้อมูลจริง (walk_min_from_hub)
function pinPosition(v: Venue, index: number, count: number): { left: string; top: string } {
  const slot = (index * 360) / Math.max(1, count);
  const jitter = (hashAngleDeg(v.id) % 24) - 12;
  const angle = ((slot + jitter - 55) * Math.PI) / 180; // เริ่มเยื้อง 12 นาฬิกา — ไม่ทับป้ายวงแหวน
  const r = radiusPctForWalk(v.walk_min_from_hub);
  const left = 50 + r * Math.cos(angle);
  const top = 50 + r * Math.sin(angle) * 0.82; // แบนลงนิดให้เข้ากับกรอบ 4:3
  return { left: `${left}%`, top: `${top}%` };
}

export default function ExplorePage() {
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const videoDialogRef = useFocusTrap<HTMLDivElement>(!!openVideo);
  const { data: hotRes, error: loadError, reload: load } = useApiResource<{ hot: Venue[] }>("/api/explore");
  const hot = hotRes?.hot ?? null; // null = กำลังโหลด — พังแล้วแยกไป loadError ข้างล่าง ไม่กลืนเงียบอีกต่อไป
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sentVideos, setSentVideos] = useState<Set<string>>(new Set());
  const showToast = useToast();

  // /api/explore คืนมาเรียง hit_rank ก่อนแล้ว unseen_rank อยู่แล้ว — filter รักษาลำดับเดิม
  // hooks ต้องมาก่อน early return ทุกตัว (pattern เดียวกับ plan/[id]/page.tsx)
  const filtered = useMemo(() => (hot ?? []).filter((v) => matchesFilter(v, filter)), [hot, filter]);

  // ปิดบั๊กเดิม: hot เคย .catch(() => {}) กลืน error เงียบ — ลอก pattern loadError จาก app/app/me/page.tsx มาใช้ตรงนี้
  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🎒</p>
        <p className="mt-3 font-bold text-ink">Couldn't load data</p>
        <button onClick={load} className="gn-press o-pill-primary o-btn-label mt-4 px-6 py-2.5">
          Try again ↻
        </button>
      </div>
    );
  }

  const sendVideo = async (v: { id: string; title: string }) => {
    try {
      await gn("/api/imports", {
        method: "POST",
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${v.id}` }),
      });
      track("import_video_places", { id: v.id });
      setSentVideos((s) => new Set(s).add(v.id));
      showToast("Clip queued 🎬 Our team pulls the spots within 24h — track it in My trips");
    } catch (e) {
      showToast(e instanceof Error ? e.message.replace(/^\d+: /, "") : "Couldn't send");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step">🔎 Explore</span>
      <h1 className="o-serif mt-2 text-[24px] font-medium text-ink">
        Every spot around <em className="text-accent">Siam</em>
      </h1>
      <p className="mb-4 text-mut">
        {hot && hot.length > 0 ? `${hot.length} spots live right now — ` : ""}proven Hits + Unseen gems with 3+ confirmations · tap one to start planning with it
      </p>

      {/* filter chips — กรอง client-side ทั้งผังและ grid พร้อมกัน */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            aria-current={filter === t.key ? "true" : undefined}
            className={`gn-press rounded-full border px-4 py-2.5 text-[13px] ${
              filter === t.key
                ? "border-pill bg-pill font-semibold text-bg"
                : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* minmax(0,…) ทุก track: ค่า default ของ grid คือ auto ซึ่งกว้างอย่างน้อยเท่า min-content ของลูก
          — ชื่อร้านยาวๆ ที่ truncate ไว้ยังดัน min-content ได้ถึง 408px แล้วล้นจอมือถือ (วัดจริงที่ 390px) */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ผังระยะเดิน — ไม่ใช่แผนที่จริง ไม่มีพิกัดจนกว่า W2
            อัตราส่วน 4:3 ต้องคงไว้ (วงแหวนเวลาเดินใช้ % ทั้งกว้างและสูง ถ้าสัดส่วนเปลี่ยนวงจะบิดตามจอ)
            แต่ห้ามใส่ min-h คู่กับ aspect: CSS จะแปลงความสูงขั้นต่ำข้ามอัตราส่วนกลับมาเป็น
            ความกว้างขั้นต่ำ (360×4/3 = 480px) แล้วดันจอล้น — วัดจริงตอนมี min-h: 390px ล้น 106px */}
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-line"
          style={{ background: "#f7f7f4" }}
        >
          {/* ข้อความเต็มตกเป็น 2 บรรทัดบนมือถือแล้วไปบังป้าย "≤15+ min" ของวงนอกสุด — มือถือใช้ข้อความสั้น */}
          <span className="o-mono absolute right-3 top-3 z-[3] rounded-full border border-line bg-bg/75 px-3 py-1.5 text-[10px] text-mut backdrop-blur">
            <span className="sm:hidden">Sample layout · W2 pending</span>
            <span className="hidden sm:inline">Walk-distance chart from BTS Siam — real positions land with W2 coordinates</span>
          </span>

          {[5, 10, 15].map((mins) => {
            const d = radiusPctForWalk(mins) * 2;
            return (
              <span
                key={mins}
                className="absolute left-1/2 top-1/2 rounded-full border border-line"
                style={{ width: `${d}%`, height: `${d}%`, transform: "translate(-50%,-50%)" }}
              >
                <span className="o-mono absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-bg px-1.5 text-[9px] text-mut">
                  {mins === 15 ? "≤15+ min" : `≤${mins} min`}
                </span>
              </span>
            );
          })}

          <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
            <span className="o-mono block whitespace-nowrap rounded-full border border-line bg-bg/85 px-3 py-1.5 text-[10px] text-ink backdrop-blur">
              🚇 BTS Siam
            </span>
          </span>

          {filtered.map((v, i) => {
            const pos = pinPosition(v, i, filtered.length);
            const shortName = v.name_th.length > 13 ? `${v.name_th.slice(0, 12)}…` : v.name_th;
            return (
              <Link
                key={v.id}
                href={`/app?add=${v.id}`}
                onClick={() => track("explore_pick", { venue_id: v.id, via: "map" })}
                className="gn-press absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 hover:scale-110"
                style={{ left: pos.left, top: pos.top }}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] bg-card-solid text-base shadow-lg ${
                    v.badge === "hit" ? "border-pill" : "border-accent"
                  }`}
                >
                  {CATEGORY_EMOJI[v.category]}
                </span>
                {/* ป้ายชื่อโผล่ตั้งแต่ sm ขึ้นไป — ที่ 390px ป้ายกว้าง ~105px ทุกอันซ้อนทับกันเอง 9 คู่
                    จนอ่านไม่ออก · มือถือเหลือหมุด+อีโมจิ แล้วแตะเข้าไปดูชื่อเต็มในหน้าวางแผน */}
                <span className="o-mono hidden whitespace-nowrap rounded-full border border-line bg-bg/80 px-2 py-0.5 text-[9px] text-ink backdrop-blur sm:block">
                  {shortName}
                </span>
              </Link>
            );
          })}

          <div className="o-mono absolute bottom-3 left-3 z-[3] flex flex-wrap gap-3 rounded-xl border border-line bg-bg/75 px-3.5 py-2 text-[10.5px] text-mut backdrop-blur">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-ink bg-card-solid" /> Hit</span>
            <span className="inline-flex items-center gap-1.5 text-accent"><span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" /> Unseen (3+ confirmed)</span>
          </div>
        </div>

        {/* grid ขวา — hit_rank ก่อนแล้ว unseen_rank (ลำดับจาก /api/explore) */}
        <div className="flex flex-col gap-2.5">
          <p className="o-mono text-[10px] text-mut">Hits first, then confirmed Unseen</p>
          {filtered.map((v) => (
            <Link
              key={v.id}
              href={`/app?add=${v.id}`}
              onClick={() => track("explore_pick", { venue_id: v.id, via: "grid" })}
              className="gn-card-e gn-lift flex items-center gap-3.5 p-3.5"
            >
              <span className={`o-grain relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl ${CATEGORY_AMBIENCE[v.category]}`}>
                <span className="relative z-[2]">{CATEGORY_EMOJI[v.category]}</span>
              </span>
              <div className="min-w-0 flex-1">
                {/* 2 บรรทัดแทนตัดทิ้ง: ที่ 390px ช่องชื่อเหลือ ~190px แต่ชื่อร้านจริงยาว 175–231px
                    ตัดทิ้งแล้ว "Campus Night Ma…" กับ "Campus Night Market" แยกกันไม่ออก */}
                <b className="line-clamp-2 text-[15px] leading-snug text-ink">{v.name_th}</b>
                <div className="mt-0.5 text-[12.5px] text-mut">
                  ~{mid(v.price_per_head_min, v.price_per_head_max)}฿/person · {standoutAttribute(v)}
                </div>
                <div className="text-[11.5px] text-ok">✓ confirmed by {v.validation_count}</div>
              </div>
              <span
                className={`o-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] ${
                  v.badge === "hit" ? "bg-pill text-bg" : "border border-accent bg-tint text-accent"
                }`}
              >
                {/* มือถือใช้ป้ายสั้น — ป้ายเต็มกินความกว้าง ~100px จากช่องชื่อที่มีอยู่น้อยอยู่แล้ว */}
                <span className="sm:hidden">{v.badge === "hit" ? `Nº${v.hit_rank}` : "NEW"}</span>
                <span className="hidden sm:inline">
                  {v.badge === "hit" ? `${INTENT_EMOJI[v.intents[0]] ?? ""} HIT Nº${v.hit_rank}` : "UNSEEN"}
                </span>
              </span>
            </Link>
          ))}
          {hot === null && <p className="gn-card-e py-8 text-center text-sm text-mut">Loading spots…</p>}
          {hot !== null && filtered.length === 0 && (
            <p className="gn-card-e py-8 text-center text-sm text-mut">Nothing matches this filter — try another</p>
          )}
        </div>
      </div>

      {/* วิดีโอครีเอเตอร์ — ย้ายลงล่างผัง (พฤติกรรมเดิมทั้งหมด) */}
      <h2 className="o-serif mt-8 text-[18px] font-medium text-ink">Real trips from creators</h2>
      <p className="mb-4 text-sm text-mut">
        Watch a clip, hit &quot;Send clip to our team&quot; — we pull its spots with prices and routes within 24h.
        (done by real humans, no scraping)
      </p>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v) => (
          <div key={v.id} className="gn-card-e overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setOpenVideo(v.id);
                track("video_open", { id: v.id });
              }}
              // border-0/p-0/appearance-none/block ล้าง UA default ของ <button> (border+padding+inline-block)
              // เพื่อให้หน้าตาเหมือน <div onClick> เดิมเป๊ะ — ของเดิมไม่มีคลาสพวกนี้เพราะเป็น div
              className="relative block aspect-video w-full cursor-pointer appearance-none border-0 bg-bg-elev p-0 text-left"
            >
              <img
                src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                alt=""
                className="h-full w-full object-cover opacity-90"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-bg/70 text-xl text-ink backdrop-blur">
                  ▶
                </span>
              </div>
            </button>
            <div className="p-3">
              <h4 className="text-[13.5px] leading-relaxed text-ink">{v.title}</h4>
              <small className="text-mut">YouTube · {v.date}</small>
              <br />
              <span className="o-mono mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] text-bg">
                {v.tag}
              </span>
              {sentVideos.has(v.id) ? (
                <p className="mt-2 text-[12.5px] font-semibold text-ok">✓ In the team queue</p>
              ) : (
                <button
                  onClick={() => sendVideo(v)}
                  className="gn-press o-pill-primary o-btn-label mt-2 block px-3 py-1.5 text-[12.5px]"
                >
                  🎬 Send clip to our team
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {openVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpenVideo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Creator clip"
            tabIndex={-1}
            ref={videoDialogRef}
            onKeyDown={(e) => e.key === "Escape" && setOpenVideo(null)}
            className="outline-none w-full max-w-[860px] overflow-hidden rounded-2xl bg-black"
          >
            <iframe
              src={`https://www.youtube.com/embed/${openVideo}?autoplay=1`}
              className="block aspect-video w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            <div className="flex items-center justify-between bg-card-solid px-3.5 py-2.5 font-bold text-ink">
              <span>{VIDEOS.find((v) => v.id === openVideo)?.title}</span>
              <button
                onClick={() => setOpenVideo(null)}
                className="gn-press o-pill-dark o-btn-label px-3.5 py-1.5"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
