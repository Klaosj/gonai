"use client";
// /app/explore — ผังระยะเดินจาก BTS สยาม (ยังไม่ใช่แผนที่จริง) + grid ที่โชว์ได้ทั้งหมด + วิดีโอครีเอเตอร์ (plan §5)
// ต้นแบบ: Gonai explore.html — ปุ่ม "ส่งคลิปให้ทีมดึงที่เที่ยว" → เข้าคิว imports จริง (ไม่เปลี่ยน)
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { Intent, Venue } from "@/lib/types";

const VIDEOS = [
  { id: "3_Fg14DzVhA", title: "5 Aesthetic Cafes in Bangkok — Relaxing Cafe Hopping", date: "ม.ค. 2026", tag: "☕ คาเฟ่ 5 ที่ในคลิป" },
  { id: "Rn0ByVaJ6eo", title: "5 Days in Bangkok — local food, aesthetic cafes, hidden gems", date: "ใหม่ล่าสุด", tag: "✨ มี hidden gems ย่านอารีย์" },
  { id: "OZrwLL-8hKc", title: "Bangkok Cafe Vlog — Chill Weekend Coffee & Brunch", date: "มี.ค. 2025", tag: "🥐 brunch 5 ที่" },
  { id: "foQ0VfRdBH8", title: "Best Coffee Shops — Nana Coffee Roasters & more", date: "ก.ค. 2025", tag: "☕ สายกาแฟจริงจัง" },
  { id: "rjXAYlkpURE", title: "Bangkok Guide: 5 Must-Dos, Hidden Gems & Tourist Traps", date: "ส.ค. 2025", tag: "⚠️ เลี่ยง tourist trap" },
  { id: "nFTdc4OW1dc", title: "Bangkok Travel Guide 2025 — ตลาด อาหาร สยามสแควร์", date: "ม.ค. 2026", tag: "🇹🇭 มุมมองนักท่องเที่ยว" },
];

const CATEGORY_EMOJI: Record<Venue["category"], string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

// hit_rank เป็นอันดับภายใน intent ของตัวเอง — โชว์อีโมจิ intent กำกับ ไม่งั้น Nº1 ซ้ำกันหลายใบอ่านแล้วงง
const INTENT_EMOJI: Record<string, string> = { work: "💻", date: "💛", family: "👨‍👩‍👧", photo: "📷" };

const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
};

type FilterKey = "all" | "unseen" | Intent | "cheap";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "✨ ทั้งหมด" },
  { key: "unseen", label: "💜 Unseen เท่านั้น" },
  { key: "work", label: "💻 นั่งทำงาน" },
  { key: "date", label: "💛 เดท" },
  { key: "family", label: "👨‍👩‍👧 ครอบครัว" },
  { key: "photo", label: "📷 ถ่ายรูป" },
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
  if (a.plugs === "all") return "ปลั๊กทุกโต๊ะ";
  if (a.plugs === "some") return "มีปลั๊ก";
  if (a.noise === "quiet") return "เงียบ ประชุมได้";
  if (a.food_level === "meals") return "มีข้าว";
  if (a.parking) return "ที่จอดรถ";
  if (a.indoor) return "ในร่ม";
  return `เดิน ${v.walk_min_from_hub} นาที`;
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

function pinPosition(v: Venue): { left: string; top: string } {
  const angle = (hashAngleDeg(v.id) * Math.PI) / 180;
  const r = radiusPctForWalk(v.walk_min_from_hub);
  const left = 50 + r * Math.cos(angle);
  const top = 50 + r * Math.sin(angle) * 0.82; // แบนลงนิดให้เข้ากับกรอบ 4:3
  return { left: `${left}%`, top: `${top}%` };
}

export default function ExplorePage() {
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [hot, setHot] = useState<Venue[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sentVideos, setSentVideos] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    gn<{ hot: Venue[] }>("/api/explore")
      .then((d) => setHot(d.hot))
      .catch(() => {});
  }, []);

  // /api/explore คืนมาเรียง hit_rank ก่อนแล้ว unseen_rank อยู่แล้ว — filter รักษาลำดับเดิม
  const filtered = useMemo(() => hot.filter((v) => matchesFilter(v, filter)), [hot, filter]);

  const sendVideo = async (v: { id: string; title: string }) => {
    try {
      await gn("/api/imports", {
        method: "POST",
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${v.id}` }),
      });
      track("import_video_places", { id: v.id });
      setSentVideos((s) => new Set(s).add(v.id));
      showToast("ส่งคลิปเข้าคิวแล้ว 🎬 ทีมงานดึงที่เที่ยวใน 24 ชม. — ดูสถานะใน ทริปของฉัน");
    } catch (e) {
      showToast(e instanceof Error ? e.message.replace(/^\d+: /, "") : "ส่งไม่สำเร็จ");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step">🔎 สำรวจ</span>
      <h1 className="o-serif mt-2 text-[24px] font-medium text-ink">
        ที่เที่ยวแถวสยาม <em className="text-accent">ทั้งหมด</em>
      </h1>
      <p className="mb-4 text-mut">
        {hot.length > 0 ? `${hot.length} ที่ที่โชว์ได้ตอนนี้ — ` : ""}Hit ที่คนไปเยอะ + Unseen ที่ validate ครบ 3 คนขึ้นไป · กดที่ที่ใช่เพื่อเริ่มวางแผนด้วยที่นั้นเลย
      </p>

      {/* filter chips — กรอง client-side ทั้งผังและ grid พร้อมกัน */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`gn-press rounded-full border px-3.5 py-1.5 text-[13px] ${
              filter === t.key
                ? "border-pill bg-pill font-semibold text-bg"
                : "border-line bg-transparent text-mut hover:border-ink hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ผังระยะเดิน — ไม่ใช่แผนที่จริง ไม่มีพิกัดจนกว่า W2 */}
        <div
          className="relative aspect-[4/3] min-h-[360px] overflow-hidden rounded-[20px] border border-line sm:min-h-[480px]"
          style={{ background: "radial-gradient(circle at 60% 40%, #16232e 0%, #0e1418 70%)" }}
        >
          <span className="o-mono absolute right-3 top-3 z-[3] rounded-full border border-line bg-bg/75 px-3 py-1.5 text-[10px] text-mut backdrop-blur">
            ผังระยะเดินจาก BTS สยาม — ตำแหน่งจริงรอพิกัดจาก W2
          </span>

          {[5, 10, 15].map((mins) => {
            const d = radiusPctForWalk(mins) * 2;
            return (
              <span
                key={mins}
                className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
                style={{ width: `${d}%`, height: `${d}%`, transform: "translate(-50%,-50%)" }}
              >
                <span className="o-mono absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-bg px-1.5 text-[9px] text-mut">
                  {mins === 15 ? "≤15+ นาที" : `≤${mins} นาที`}
                </span>
              </span>
            );
          })}

          <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
            <span className="o-mono block whitespace-nowrap rounded-full border border-line bg-bg/85 px-3 py-1.5 text-[10px] text-ink backdrop-blur">
              🚇 BTS สยาม
            </span>
          </span>

          {filtered.map((v) => {
            const pos = pinPosition(v);
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
                <span className="o-mono whitespace-nowrap rounded-full border border-line bg-bg/80 px-2 py-0.5 text-[9px] text-ink backdrop-blur">
                  {shortName}
                </span>
              </Link>
            );
          })}

          <div className="o-mono absolute bottom-3 left-3 z-[3] flex flex-wrap gap-3 rounded-xl border border-line bg-bg/75 px-3.5 py-2 text-[10.5px] text-mut backdrop-blur">
            <span>⚪ Hit</span>
            <span className="text-accent">🔵 Unseen (ยืนยัน ≥3 คน)</span>
          </div>
        </div>

        {/* grid ขวา — hit_rank ก่อนแล้ว unseen_rank (ลำดับจาก /api/explore) */}
        <div className="flex flex-col gap-2.5">
          <p className="o-mono text-[10px] text-mut">เรียง Hit ก่อน แล้ว Unseen ที่ยืนยันแล้ว</p>
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
                <b className="block truncate text-[15px] text-ink">{v.name_th}</b>
                <div className="mt-0.5 text-[12.5px] text-mut">
                  ~{mid(v.price_per_head_min, v.price_per_head_max)}฿/คน · {standoutAttribute(v)}
                </div>
                <div className="text-[11.5px] text-ok">✓ ยืนยันแล้ว {v.validation_count} คน</div>
              </div>
              <span
                className={`o-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] ${
                  v.badge === "hit" ? "bg-pill text-bg" : "bg-accent text-bg"
                }`}
              >
                {v.badge === "hit" ? `${INTENT_EMOJI[v.intents[0]] ?? ""} HIT Nº${v.hit_rank}` : "UNSEEN"}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="gn-card-e py-8 text-center text-sm text-mut">ไม่มีที่ตรงตัวกรองนี้ — ลองเปลี่ยนตัวกรองดู</p>
          )}
        </div>
      </div>

      {/* วิดีโอครีเอเตอร์ — ย้ายลงล่างผัง (พฤติกรรมเดิมทั้งหมด) */}
      <h2 className="o-serif mt-8 text-[18px] font-medium text-ink">วิดีโอเที่ยวจริงจากครีเอเตอร์</h2>
      <p className="mb-4 text-sm text-mut">
        ดูคลิปแล้วกด &quot;ส่งคลิปให้ทีมดึงที่เที่ยว&quot; — ทีมงานดึงสถานที่ในคลิปพร้อมราคา/เส้นทางให้ใน 24 ชม.
        (ทำโดยคนจริง ไม่ scrape)
      </p>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v) => (
          <div key={v.id} className="gn-card-e overflow-hidden">
            <div
              className="relative aspect-video cursor-pointer bg-bg-elev"
              onClick={() => {
                setOpenVideo(v.id);
                track("video_open", { id: v.id });
              }}
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
            </div>
            <div className="p-3">
              <h4 className="text-[13.5px] leading-relaxed text-ink">{v.title}</h4>
              <small className="text-mut">YouTube · {v.date}</small>
              <br />
              <span className="o-mono mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] text-bg">
                {v.tag}
              </span>
              {sentVideos.has(v.id) ? (
                <p className="mt-2 text-[12.5px] font-semibold text-ok">✓ อยู่ในคิวทีมงานแล้ว</p>
              ) : (
                <button
                  onClick={() => sendVideo(v)}
                  className="gn-press o-pill-primary o-btn-label mt-2 block px-3 py-1.5 text-[12.5px]"
                >
                  🎬 ส่งคลิปให้ทีมดึงที่เที่ยว
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
          <div className="w-full max-w-[860px] overflow-hidden rounded-2xl bg-black">
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
                ปิด ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-card-solid px-5 py-2.5 text-[13px] text-ink">
          {toast}
        </div>
      )}
    </div>
  );
}
