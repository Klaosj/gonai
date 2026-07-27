"use client";
// /app/group — ฟีเจอร์กลุ่มยังไม่เปิด: หน้านี้เป็นตัววัด demand จริง
// (mockup โหวต/แบ่งจ่ายเดิมถูกถอด — ของครึ่งปลอมทำร้าย trust มากกว่าไม่มี)
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/api";

const PLANNED = [
  { icon: "🗳", title: "Vote on where to go", desc: "Everyone votes — we tally the winner, no group-chat arguments" },
  { icon: "🧮", title: "Auto split-pay", desc: "See who paid what and each person's share — with a PromptPay link" },
  { icon: "📍", title: "A fair meeting point", desc: "Based on everyone's starting zone — picks spots all can reach in similar time" },
];

export default function GroupPage() {
  const [interested, setInterested] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <span className="gn-step">👥 Group</span>
      <h1 className="o-serif mt-2 text-[22px] font-medium text-ink">Trips with friends — in the works</h1>
      <p className="mb-6 text-mut">
        Solo planning is fully live. Group mode is being built — here's what's coming:
      </p>

      <div className="space-y-3">
        {PLANNED.map((f) => (
          <div key={f.title} className="gn-card-e flex items-start gap-3 p-4">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="mt-0.5 text-sm text-mut">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card-solid/60 p-5 text-center">
        {interested ? (
          <p className="font-semibold text-ok">Got it 💚 You'll hear first when it opens</p>
        ) : (
          <>
            <p className="mb-3 font-semibold text-ink">Want group mode? Tell us — the more interest, the sooner it ships</p>
            <button
              onClick={() => {
                track("group_interest", {});
                setInterested(true);
              }}
              className="gn-press o-pill-primary o-btn-label px-6 py-2.5"
            >
              Interested! Tell me when it opens 🙋
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-mut">
        Meanwhile, plan a solo trip —{" "}
        <Link href="/app" className="font-bold text-accent underline">
          Go to planner
        </Link>
      </p>
    </div>
  );
}
