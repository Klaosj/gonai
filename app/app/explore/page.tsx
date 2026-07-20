"use client";
// /app/explore — วิดีโอครีเอเตอร์ (เล่นได้จริง) + กำลัง Hit จาก data จริง
// ปุ่ม "ส่งคลิปให้ทีมดึงที่เที่ยว" → เข้าคิว imports จริง (ไม่มี toast หลอกอีกต่อไป)
import Link from "next/link";
import { useEffect, useState } from "react";
import { gn, track } from "@/lib/api";
import { mid } from "@/lib/costing";
import type { Venue } from "@/lib/types";

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

const CATEGORY_AMBIENCE: Record<Venue["category"], string> = {
  cafe: "o-ambience-work",
  restaurant: "o-ambience-date",
  activity: "o-ambience-photo",
  market: "o-ambience-family",
};

export default function ExplorePage() {
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [hot, setHot] = useState<Venue[]>([]);
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
      <h1 className="o-serif mt-2 text-[22px] font-medium text-ink">วิดีโอเที่ยวจริงจากครีเอเตอร์</h1>
      <p className="mb-4 text-mut">
        ดูคลิปแล้วกด &quot;ส่งคลิปให้ทีมดึงที่เที่ยว&quot; — ทีมงานดึงสถานที่ในคลิปพร้อมราคา/เส้นทางให้ใน 24 ชม.
        (ทำโดยคนจริง ไม่ scrape)
      </p>

      <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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

      <h2 className="o-serif text-[18px] font-medium text-ink">กำลัง Hit + Unseen ที่ยืนยันแล้ว</h2>
      <p className="mb-3 text-sm text-mut">จัดอันดับจาก data จริงในระบบ — กดเพื่อเริ่มวางแผนด้วยที่นั้นเลย</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hot.map((p) => (
          <Link
            key={p.id}
            href={`/app?add=${p.id}`}
            onClick={() => track("explore_pick", { venue_id: p.id })}
            className="gn-card-e gn-lift overflow-hidden"
          >
            <div className={`o-grain relative h-[110px] ${CATEGORY_AMBIENCE[p.category]}`}>
              <span
                className={`o-mono absolute left-2 top-2 z-[2] rounded-full px-2.5 py-1 text-[10px] ${
                  p.badge === "unseen" ? "bg-accent text-bg" : "bg-pill text-bg"
                }`}
              >
                {p.badge === "unseen" ? `✨ Unseen · ยืนยัน ${p.validation_count} คน` : `🔥 Hit #${p.hit_rank}`}
              </span>
              <span className="absolute bottom-2 right-3 z-[2] text-3xl">{CATEGORY_EMOJI[p.category]}</span>
            </div>
            <div className="p-3">
              <h4 className="text-[14.5px] font-semibold leading-snug text-ink">{p.name_th}</h4>
              <div className="text-xs text-mut">
                ~{mid(p.price_per_head_min, p.price_per_head_max)}฿/คน · เปิด {p.open_time}–{p.close_time}
              </div>
              <div className="mt-1 text-[11.5px] font-semibold text-accent">+ เริ่มวางแผนด้วยที่นี่ →</div>
            </div>
          </Link>
        ))}
        {hot.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-mut">กำลังโหลด…</p>
        )}
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
