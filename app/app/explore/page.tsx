"use client";
// /app/explore — วิดีโอครีเอเตอร์ (3-col) + กำลัง Hit ในย่านใกล้คุณ (4-col)
// mockup painai-app-v3.html
import { useState } from "react";
import { track } from "@/lib/api";

const VIDEOS = [
  { id: "3_Fg14DzVhA", title: "5 Aesthetic Cafes in Bangkok — Relaxing Cafe Hopping", date: "ม.ค. 2026", tag: "☕ คาเฟ่ 5 ที่ในคลิป" },
  { id: "Rn0ByVaJ6eo", title: "5 Days in Bangkok — local food, aesthetic cafes, hidden gems", date: "ใหม่ล่าสุด", tag: "✨ มี hidden gems ย่านอารีย์" },
  { id: "OZrwLL-8hKc", title: "Bangkok Cafe Vlog — Chill Weekend Coffee & Brunch", date: "มี.ค. 2025", tag: "🥐 brunch 5 ที่" },
  { id: "foQ0VfRdBH8", title: "Best Coffee Shops — Nana Coffee Roasters & more", date: "ก.ค. 2025", tag: "☕ สายกาแฟจริงจัง" },
  { id: "rjXAYlkpURE", title: "Bangkok Guide: 5 Must-Dos, Hidden Gems & Tourist Traps", date: "ส.ค. 2025", tag: "⚠️ เลี่ยง tourist trap" },
  { id: "nFTdc4OW1dc", title: "Bangkok Travel Guide 2025 — ตลาด อาหาร สยามสแควร์", date: "ม.ค. 2026", tag: "🇹🇭 มุมมองนักท่องเที่ยว" },
];

const HOT_PLACES = [
  { name: "Slowbar Siam", emoji: "☕", zone: "สยาม", price: "~280฿", badge: "🔥 #1 สัปดาห์นี้", unseen: false },
  { name: "ตลาดนัดจุฬาฯ", emoji: "🛍", zone: "สามย่าน", price: "~80฿", badge: "🔥 มาแรง", unseen: false },
  { name: "บ้านครูโฮมคาเฟ่", emoji: "☕", zone: "ริมคลอง", price: "~190฿", badge: "✨ Unseen", unseen: true },
  { name: "ชุมชนบ้านบุ", emoji: "🏺", zone: "บางกอกน้อย", price: "จาก TAT", badge: "✨ Unseen", unseen: true },
];

export default function ExplorePage() {
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step gn-step-purple">🔎 สำรวจ</span>
      <h1 className="gn-serif mt-2 text-[22px] font-extrabold">วิดีโอเที่ยวจริงจากครีเอเตอร์</h1>
      <p className="mb-4 text-gn-mut">
        ดูคลิปแล้วกด &quot;เพิ่มที่จากคลิปนี้&quot; — AI จะดึงสถานที่ในคลิปเข้าแผนให้พร้อมค่าเดินทาง (คลิปเปิดดูได้จริง)
      </p>

      <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-2xl border border-gn-line bg-gn-card">
            <div
              className="relative aspect-video cursor-pointer bg-gn-ink"
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
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/90 text-xl text-gn-orange shadow-lg">
                  ▶
                </span>
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-[13.5px] leading-relaxed">{v.title}</h4>
              <small className="text-gn-mut">YouTube · {v.date}</small>
              <br />
              <span className="mt-1.5 inline-block rounded-full bg-gn-mint-bg px-2.5 py-0.5 text-[11px] font-bold text-gn-green">
                {v.tag}
              </span>
              <button
                onClick={() => {
                  track("import_video_places", { id: v.id });
                  showToast(`ดึงสถานที่จากคลิป "${v.title}" เข้า wishlist แล้ว — ดูในแท็บ ทริปของฉัน`);
                }}
                className="mt-2 block rounded-lg border-[1.5px] border-gn-line px-3 py-1.5 text-[12.5px] font-semibold hover:border-gn-orange hover:text-gn-orange"
              >
                + เพิ่มที่จากคลิปนี้
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="gn-serif text-[18px] font-extrabold">กำลัง Hit ในย่านใกล้คุณ</h2>
      <p className="mb-3 text-sm text-gn-mut">จากยอด save ของผู้ใช้ + TAT open data — อัปเดตทุกวัน</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HOT_PLACES.map((p) => (
          <div key={p.name} className="overflow-hidden rounded-2xl border border-gn-line bg-gn-card">
            <div className="relative h-[110px] bg-gradient-to-br from-[#d8ede4] to-[#efe9ff]">
              <span
                className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white ${
                  p.unseen ? "bg-gn-purple" : "bg-gn-orange"
                }`}
              >
                {p.badge}
              </span>
            </div>
            <div className="p-3">
              <h4 className="text-[14.5px] font-bold leading-snug">{p.name}</h4>
              <div className="text-xs text-gn-mut">
                {p.emoji} · {p.zone} · {p.price}
              </div>
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
            <div className="flex items-center justify-between bg-gn-card px-3.5 py-2.5 font-bold">
              <span>{VIDEOS.find((v) => v.id === openVideo)?.title}</span>
              <button
                onClick={() => setOpenVideo(null)}
                className="rounded-lg bg-gn-cream px-3.5 py-1.5 font-bold"
              >
                ปิด ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-gn-ink px-5 py-2.5 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
