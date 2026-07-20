"use client";
// /app/group — โหวต + แบ่งจ่าย + feed (mockup painai-app-v3.html)
// 2-col (vote | split + constraints) · vote option มี thumbnail
import { useState } from "react";
import { track } from "@/lib/api";

const MEMBERS = [
  { initial: "K", color: "#ff6b35" },
  { initial: "B", color: "#0d7a5f" },
  { initial: "P", color: "#7c5cff" },
  { initial: "N", color: "#e6a817" },
];

const OPTIONS = [
  {
    id: 1,
    title: "☕ คาเฟ่สยาม + นิทรรศการ BACC",
    detail: "~360฿/คน · ทุกคนถึงใน ≤50 นาที",
    thumb: "☕",
    bgFrom: "#d8ede4",
    bgTo: "#efe9ff",
    votes: 2,
  },
  {
    id: 2,
    title: "🛍 ตลาดนัดจตุจักร + ชาไข่มุก",
    detail: "~300฿/คน · ⚠️ กลางแจ้ง เสี่ยงฝนหลัง 17:00",
    thumb: "🛍",
    bgFrom: "#ffe7c2",
    bgTo: "#ffd9c2",
    votes: 1,
  },
  {
    id: 3,
    title: "✨ คาเฟ่ลับริมคลอง + ตลาดพลู",
    detail: "~280฿/คน · Unseen — ได้แต้ม validate x2",
    thumb: "✨",
    bgFrom: "#e0d4ff",
    bgTo: "#cfc6e8",
    votes: 1,
  },
];

const FEED = [
  { emoji: "💬", text: <><b>B:</b> ขอไม่กลางแจ้งนะ ฝนจะตก 🙏</> },
  { emoji: "✅", text: <><b>P</b> โหวต &quot;คาเฟ่สยาม + BACC&quot; แล้ว</> },
  { emoji: "🕐", text: <>ปิดโหวตอัตโนมัติ ศุกร์ 20:00 — แผน + นัดเวลาจะส่งเข้า LINE กลุ่ม</> },
];

export default function GroupPage() {
  const [votes, setVotes] = useState<Record<number, number>>(
    Object.fromEntries(OPTIONS.map((o) => [o.id, o.votes])),
  );
  const [voted, setVoted] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const vote = (id: number) => {
    if (voted.has(id)) return;
    setVotes((v) => ({ ...v, [id]: v[id] + 1 }));
    setVoted((s) => new Set(s).add(id));
    track("group_vote", { option: id });
    showToast("โหวตแล้ว — เหลือ B ยังไม่โหวต ระบบเตือนใน LINE ให้แล้ว");
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <span className="gn-step gn-step-purple">👥 กลุ่ม</span>
      <h1 className="gn-serif mt-2 text-[22px] font-extrabold">ทริปกลุ่ม: &quot;เสาร์นี้ไปไหนดี แก๊งมหาลัย&quot;</h1>
      <p className="mb-4 text-gn-mut">
        โหวตจาก 3 ตัวเลือกที่ AI คัดตามเงื่อนไขของทุกคนรวมกัน (งบต่ำสุดในกลุ่ม 500฿ · ทุกคนออกจากคนละย่าน)
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gn-line bg-gn-card p-4">
          <div className="mb-3.5 flex items-center gap-2">
            {MEMBERS.map((m) => (
              <div
                key={m.initial}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-gn-card font-extrabold text-white shadow"
                style={{ background: m.color }}
              >
                {m.initial}
              </div>
            ))}
            <button
              onClick={() => showToast("คัดลอกลิงก์เชิญแล้ว — ส่งใน LINE ได้เลย")}
              className="rounded-full border-[1.5px] border-dashed border-gn-line px-4 py-2 font-bold text-gn-mut"
            >
              + ชวนเพื่อน (ลิงก์ LINE)
            </button>
          </div>

          {OPTIONS.map((o) => {
            const pct = (votes[o.id] / MEMBERS.length) * 100;
            return (
              <div
                key={o.id}
                className="mb-2.5 flex items-center gap-3 rounded-xl border border-gn-line bg-gn-card p-3"
              >
                <div
                  className="flex h-[56px] w-[74px] shrink-0 items-center justify-center rounded-lg text-2xl"
                  style={{
                    background: `linear-gradient(120deg, ${o.bgFrom}, ${o.bgTo})`,
                  }}
                >
                  {o.thumb}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{o.title}</b>
                  <br />
                  <small className="text-gn-mut">{o.detail}</small>
                  <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-gn-cream">
                    <div
                      className="h-full rounded-full bg-gn-orange transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <small className="text-gn-mut">{votes[o.id]}/{MEMBERS.length} โหวต</small>
                </div>
                <button
                  onClick={() => vote(o.id)}
                  className={`shrink-0 rounded-lg border-[1.5px] px-4 py-2 font-extrabold ${
                    voted.has(o.id)
                      ? "border-gn-green bg-gn-green text-white"
                      : "border-gn-green text-gn-green"
                  }`}
                >
                  {voted.has(o.id) ? "โหวตแล้ว ✓" : "โหวต"}
                </button>
              </div>
            );
          })}

          <div className="mt-3.5">
            {FEED.map((f, i) => (
              <div
                key={i}
                className="border-b border-dashed border-gn-line py-2 text-[12.5px] text-gn-mut last:border-b-0"
              >
                {f.emoji} {f.text}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-xl border border-gn-mint-bd bg-gn-mint-bg p-3.5">
            <h4 className="mb-2 font-bold">💸 แบ่งจ่ายอัตโนมัติ (ตัวเลือกที่นำอยู่)</h4>
            <div className="flex justify-between py-1 text-[13px]">
              <span>คาเฟ่ (เฉลี่ย)</span>
              <span>280฿ × 4</span>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span>เดินทางรวมของกลุ่ม</span>
              <span>188฿</span>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span>BACC</span>
              <span>ฟรี</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-gn-mint-bd pt-2 text-[15px] font-extrabold text-gn-green-dark">
              <span>ตกคนละ</span>
              <span>327฿</span>
            </div>
            <button
              onClick={() => showToast("สร้างลิงก์ PromptPay เรียกเก็บ 327฿/คน ส่งเข้ากลุ่มแล้ว")}
              className="mt-2.5 w-full rounded-lg bg-gn-green py-2.5 font-extrabold text-white"
            >
              เรียกเก็บผ่าน PromptPay
            </button>
          </div>

          <div className="rounded-2xl border border-gn-line bg-gn-card p-3.5">
            <h4 className="mb-1.5 font-bold">🧠 เงื่อนไขรวมของกลุ่ม</h4>
            <div className="text-[13px] leading-relaxed text-gn-mut">
              • งบ: ต่ำสุดในกลุ่ม 500฿ (ของ N) — AI ไม่เสนอเกินนี้
              <br />
              • B แพ้แดด/ฝน → ตัด outdoor หลัง 17:00
              <br />
              • P กินเผ็ดไม่ได้ → ร้านต้องมีเมนูไม่เผ็ด
              <br />
              • ทุกคนออกจากคนละย่าน → เลือกจุดที่ถึงพร้อมกัน ≤50 นาที
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="gn-toast fixed bottom-[26px] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-gn-ink px-5 py-2.5 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
