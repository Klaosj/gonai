import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

// Landing page (PART B) — แทน redirect เดิม
// design v0.5 "Origin" — cinematic dark + serif editorial + mono labels
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* mini header — landing ไม่ใช้ Shell ของแอป */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-3.5">
        <span className="flex items-baseline gap-2">
          <b className="o-serif text-[19px] font-semibold text-ink">
            <em>Go</em>Nai
          </b>
          <span className="hidden text-[11px] text-ink/70 sm:inline">plan · go · ไม่เกินงบ</span>
        </span>
        <Link
          href="/app"
          className="gn-press o-pill-dark o-btn-label px-4 py-1.5 text-sm"
        >
          เข้าแอป →
        </Link>
      </header>
      {/* Hero — เต็มจอ ambience dusk + grain (Origin signature) */}
      <section className="o-grain o-ambience-date relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-28 text-ink">
        <div className="relative z-[2] mx-auto max-w-4xl text-center">
          <span className="gn-rise o-mono inline-block rounded-full bg-accent px-4 py-1.5 text-[11px] text-bg">
            🎉 เบต้า · ฟรีช่วงทดลอง
          </span>
          <h1 className="o-serif gn-rise gn-d1 mt-6 text-4xl font-light leading-[1.15] sm:text-6xl">
            วางแผนเที่ยว 1 วัน
            <br />
            <em>รู้งบจริงทุกบาท</em> ก่อนออกจากบ้าน
          </h1>
          <p className="gn-rise gn-d1 mx-auto mt-6 max-w-xl text-lg text-ink/80">
            คัด Top 3 จากเงื่อนไขของคุณ ด้วยข้อมูลที่คนจริง validate — พร้อมค่าวิน เรือ สองแถว รวมในงบเดียว
          </p>
          <div className="gn-rise gn-d1">
            <Link
              href="/app"
              className="gn-press gn-cta o-pill-primary o-btn-label mt-8 inline-block px-8 py-3.5 text-base"
            >
              เริ่มวางแผนฟรี ▶
            </Link>
            <p className="mt-3 text-xs text-ink/60">ไม่ต้องสมัคร · ใช้งานได้เลย</p>
          </div>

          {/* ask-style bar — ลิงก์ไป /app เฉยๆ ไม่ใช่ AI chat จริง (Origin signature element) */}
          <Link
            href="/app"
            className="gn-press gn-rise gn-d1 o-grain group mx-auto mt-10 flex max-w-lg items-center gap-3 rounded-full border border-line bg-bg/50 px-5 py-3.5 text-left backdrop-blur-md"
          >
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink/60">เสาร์นี้ไปไหนดี งบ 450฿…</span>
            <span className="o-pill-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base">
              ↑
            </span>
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="o-serif text-center text-3xl font-medium text-ink">
          เคยไปเที่ยวแล้วจ่ายเกินงบ?
        </h2>
        <p className="mt-3 text-center text-mut">
          ปัญหาที่คนไทยเจอทุกครั้งที่วางแผนเที่ยว
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "💸", title: "งบเกิน", desc: "คิดแค่ค่ากิน ลืมค่าเดินทาง ค่าเรือ ค่าวิน" },
            { icon: "🤷", title: "ไม่รู้จะไปไหน", desc: "เสิร์จหาที่ 30 นาที ก็ยังไม่ตัดสินใจ" },
            { icon: "📍", title: "ที่ลับไม่รู้จัก", desc: "ไปแต่ที่ดังๆ ไม่รู้จัก hidden gems" },
          ].map((p) => (
            <div key={p.title} className="gn-card-e gn-lift p-5 text-center">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 font-semibold text-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-mut">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-bg-elev px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="o-serif text-center text-3xl font-medium text-ink">
            ใช้งานง่ายใน 3 ขั้นตอน
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { num: "01", title: "บอกว่าอยากทำอะไร", desc: "เลือก intent — นั่งทำงาน / เดท / ครอบครัว / ถ่ายรูป" },
              { num: "02", title: "เลือกจาก Top 3", desc: "คัดให้ 2 ที่ฮิต + 1 ที่ลับ พร้อมราคาและวิธีเดินทาง" },
              { num: "03", title: "ดูแผน + งบรวม", desc: "วิน เรือ เดิน รวมในงบเดียว เห็นเหลือ/เกิน ทันที" },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div className="o-mono mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card-solid text-[13px] text-ink">
                  {s.num}
                </div>
                <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-mut">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="o-serif text-center text-3xl font-medium text-ink">
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
            <div key={f.text} className="gn-card-e flex items-start gap-3 p-4">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm text-ink">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="o-grain o-ambience-family relative px-6 py-16 text-center text-ink">
        <div className="relative z-[2]">
          <h2 className="o-serif text-3xl font-medium">
            <em>ลองเริ่มวางแผนเที่ยวเสาร์นี้</em>
          </h2>
          <p className="mt-2 text-ink/80">ฟรี · ไม่ต้องสมัคร · ใช้งานได้เลย</p>
          <Link href="/app" className="gn-press gn-cta o-pill-primary o-btn-label mt-6 inline-block px-8 py-3.5 text-base">
            เริ่มเลย ▶
          </Link>
          <p className="mt-10 text-sm font-semibold text-ink/90">
            ยังไม่ใช่ย่านคุณ? ฝากช่องทางไว้ — เปิดโซนใหม่เมื่อไหร่รู้ก่อนใคร
          </p>
          <WaitlistForm source="landing_cta" />
        </div>
      </section>

      <footer className="o-mono-text bg-bg px-6 py-8 text-center text-xs text-mut">
        <p>GoNai — plan · go · ไม่เกินงบ</p>
        <p className="mt-1">เบต้า · ข้อมูลชุดตัวอย่าง — รอ data จริงจาก W2 field sprint</p>
      </footer>
    </div>
  );
}