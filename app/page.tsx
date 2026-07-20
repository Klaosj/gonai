import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

// Landing page (PART B) — แทน redirect เดิม
// อ้างอิง PaiNai v0.3 design tokens
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gn-bg">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gn-green to-gn-purple px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold">
            🎉 เบต้า · ฟรีช่วงทดลอง
          </span>
          <h1 className="gn-serif mt-6 text-4xl font-bold leading-tight sm:text-5xl">
            วางแผนเที่ยว 1 วัน
            <br />
            รู้งบจริงทุกบาท ก่อนออกจากบ้าน
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg opacity-90">
            AI คัด Top 3 จากเงื่อนไขของคุณ — พร้อมค่าวิน เรือ สองแถว รวมในงบเดียว
          </p>
          <Link
            href="/app"
            className="mt-8 inline-block rounded-full bg-gn-orange px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-gn-orange-dark"
          >
            เริ่มวางแผนฟรี ▶
          </Link>
          <p className="mt-3 text-xs opacity-75">ไม่ต้องสมัคร · ใช้งานได้เลย</p>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold text-gn-ink">
          เคยไปเที่ยวแล้วจ่ายเกินงบ?
        </h2>
        <p className="mt-3 text-center text-gn-mut">
          ปัญหาที่คนไทยเจอทุกครั้งที่วางแผนเที่ยว
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "💸", title: "งบเกิน", desc: "คิดแค่ค่ากิน ลืมค่าเดินทาง ค่าเรือ ค่าวิน" },
            { icon: "🤷", title: "ไม่รู้จะไปไหน", desc: "เสิร์จหาที่ 30 นาที ก็ยังไม่ตัดสินใจ" },
            { icon: "📍", title: "ที่ลับไม่รู้จัก", desc: "ไปแต่ที่ดังๆ ไม่รู้จัก hidden gems" },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gn-line bg-white p-5 text-center"
            >
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 font-bold text-gn-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-gn-mut">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold text-gn-ink">
            ใช้งานง่ายใน 3 ขั้นตอน
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                num: "①",
                title: "บอกว่าอยากทำอะไร",
                desc: "เลือก intent — นั่งทำงาน / เดท / ครอบครัว / ถ่ายรูป",
                color: "bg-gn-green",
              },
              {
                num: "②",
                title: "เลือกจาก Top 3",
                desc: "AI คัด 2 ที่ฮิต + 1 ที่ลับ พร้อมราคาและวิธีเดินทาง",
                color: "bg-gn-orange",
              },
              {
                num: "③",
                title: "ดูแผน + งบรวม",
                desc: "วิน เรือ เดิน รวมในงบเดียว เห็นเหลือ/เกิน ทันที",
                color: "bg-gn-purple",
              },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${s.color} text-xl font-bold text-white`}
                >
                  {s.num}
                </div>
                <h3 className="mt-3 font-bold text-gn-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-gn-mut">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold text-gn-ink">
          ทำไมถึงแม่น
        </h2>
        <div className="mt-8 space-y-3">
          {[
            { icon: "✅", text: "ข้อมูล validate โดยผู้ใช้จริง — ราคาที่คนไทยจ่ายจริง ไม่ใช่ราคาในเว็บท่องเที่ยว" },
            { icon: "🏛", text: "สถานที่ Unseen จาก TAT open data — ที่ลับที่ยังไม่ดัง" },
            { icon: "🗺", text: "เส้นทางจริง — วิน เรือแสนแสบ สองแถว เก็บโดยทีมงาน ไม่ใช่แค่ Grab" },
            { icon: "☔", text: "ปรับแผนได้ทันที — ฝนตก? แอปหาที่ในร่มในงบที่เหลือให้" },
            { icon: "🔒", text: "ข้อมูลส่วนตัวตาม PDPA — ลบได้ทุกเมื่อ ไม่ขายให้ใคร" },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-start gap-3 rounded-xl border border-gn-line bg-white p-4"
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm text-gn-ink">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-gn-green to-gn-purple px-6 py-16 text-center text-white">
        <h2 className="gn-serif text-3xl font-bold">ลองเริ่มวางแผนเที่ยวเสาร์นี้</h2>
        <p className="mt-2 opacity-90">ฟรี · ไม่ต้องสมัคร · ใช้งานได้เลย</p>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-full bg-gn-orange px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-gn-orange-dark"
        >
          เริ่มเลย ▶
        </Link>
        <p className="mt-10 text-sm font-semibold opacity-90">
          ยังไม่ใช่ย่านคุณ? ฝากช่องทางไว้ — เปิดโซนใหม่เมื่อไหร่รู้ก่อนใคร
        </p>
        <WaitlistForm source="landing_cta" />
      </section>

      <footer className="bg-white px-6 py-8 text-center text-xs text-gn-mut">
        <p>ไปไหน PaiNai — plan · go · ไม่เกินงบ</p>
        <p className="mt-1">เบต้า · ข้อมูลชุดตัวอย่าง — รอ data จริงจาก W2 field sprint</p>
      </footer>
    </div>
  );
}