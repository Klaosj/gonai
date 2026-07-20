"use client";
// /app/group — ฟีเจอร์กลุ่มยังไม่เปิด: หน้านี้เป็นตัววัด demand จริง
// (mockup โหวต/แบ่งจ่ายเดิมถูกถอด — ของครึ่งปลอมทำร้าย trust มากกว่าไม่มี)
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/api";

const PLANNED = [
  { icon: "🗳", title: "โหวตเลือกที่เที่ยว", desc: "เพื่อนแต่ละคนโหวต — ระบบสรุปให้ว่าที่ไหนชนะ ไม่ต้องเถียงกันในแชท" },
  { icon: "🧮", title: "แบ่งจ่ายอัตโนมัติ", desc: "จบทริปเห็นเลยใครจ่ายอะไร ตกคนละเท่าไหร่ — พร้อมลิงก์ PromptPay" },
  { icon: "📍", title: "จุดนัดที่แฟร์กับทุกคน", desc: "คิดจากย่านที่แต่ละคนออก — เลือกที่ที่ทุกคนถึงในเวลาพอๆ กัน" },
];

export default function GroupPage() {
  const [interested, setInterested] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <span className="gn-step gn-step-purple">👥 กลุ่ม</span>
      <h1 className="gn-serif mt-2 text-[24px] font-extrabold">เที่ยวกับเพื่อน — กำลังพัฒนา</h1>
      <p className="mb-6 text-gn-mut">
        ตอนนี้ GoNai วางแผนเดี่ยวได้เต็มรูปแบบแล้ว ส่วนโหมดกลุ่มกำลังสร้างอยู่ — นี่คือสิ่งที่กำลังจะมา:
      </p>

      <div className="space-y-3">
        {PLANNED.map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-gn-line bg-gn-card p-4">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-0.5 text-sm text-gn-mut">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gn-mint-bd bg-gn-mint-bg p-5 text-center">
        {interested ? (
          <p className="font-bold text-gn-green-dark">รับทราบแล้ว 💚 เปิดเมื่อไหร่จะบอกก่อนใคร</p>
        ) : (
          <>
            <p className="mb-3 font-semibold">อยากได้โหมดกลุ่มไหม? กดบอกเราหน่อย — ยิ่งคนสนใจเยอะ ยิ่งมาเร็ว</p>
            <button
              onClick={() => {
                track("group_interest", {});
                setInterested(true);
              }}
              className="rounded-full bg-gn-purple px-6 py-2.5 font-bold text-white"
            >
              สนใจ! เปิดเมื่อไหร่บอกด้วย 🙋
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gn-mut">
        ระหว่างนี้ ลองวางแผนทริปเดี่ยวก่อน —{" "}
        <Link href="/app" className="font-bold text-gn-green underline">
          ไปหน้าวางแผน
        </Link>
      </p>
    </div>
  );
}
