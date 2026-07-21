import Link from "next/link";
import Logo from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";

// Landing page (PART B) — แทน redirect เดิม
// design v0.5 "Origin" — cinematic dark + serif editorial + mono labels
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* mini header — landing ไม่ใช้ Shell ของแอป */}
      {/* pt สูงกว่า pb — เผื่อหัวเครื่องบินของโลโก้ที่ยื่นเหนือ cap height */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pb-3 pt-5">
        <span className="flex items-baseline gap-2">
          <Logo className="text-[19px]" />
          <span className="hidden text-[11px] text-ink/70 sm:inline">plan · go · never over budget</span>
        </span>
        <Link
          href="/app"
          className="gn-press o-pill-dark o-btn-label px-4 py-1.5 text-sm"
        >
          Open app →
        </Link>
      </header>
      {/* Hero — เต็มจอ ขาวล้วน + grain (Mindtrip signature, plan §4.2) */}
      <section className="o-grain bg-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-28 text-ink">
        {/* (7) sticker collage จากต้นแบบ — ซ่อน < lg กันชนเนื้อหา */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden lg:block">
          <span className="gn-cloud absolute left-[12%] top-[16%] text-[46px] drop-shadow-lg">☁️</span>
          <span className="gn-cloud absolute right-[10%] top-[22%] text-[36px] drop-shadow-md" style={{ animationDelay: "-7s" }}>☁️</span>
          <span className="gn-bob absolute bottom-[24%] left-[8%] text-[64px] drop-shadow-xl">🛺</span>
          <span className="gn-bob absolute bottom-[18%] right-[9%] text-[56px] drop-shadow-xl" style={{ animationDelay: "-3s" }}>⛴️</span>
          <div className="gn-floaty absolute left-[1%] top-[30%] hidden items-center gap-2.5 rounded-2xl border border-line bg-card-solid px-4 py-2.5 text-left text-[12.5px] font-semibold shadow-[0_2px_6px_rgba(18,20,17,0.05),0_18px_44px_rgba(18,20,17,0.10)] xl:flex">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent text-[13px] text-white">✓</span>
            <span>Fare confirmed<small className="block font-medium text-mut">by 9 real travelers</small></span>
          </div>
          <div className="gn-floaty absolute right-[1%] top-[38%] hidden items-center gap-2.5 rounded-2xl border border-line bg-card-solid px-4 py-2.5 text-left text-[12.5px] font-semibold shadow-[0_2px_6px_rgba(18,20,17,0.05),0_18px_44px_rgba(18,20,17,0.10)] xl:flex" style={{ animationDelay: "-4s" }}>
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent-bright text-[13px]">🚝</span>
            <span>Lat Phrao → Siam<small className="block font-medium text-mut">BTS 44฿ · one way</small></span>
          </div>
          <div className="gn-floaty absolute bottom-[34%] right-[13%] flex items-center gap-2.5 rounded-2xl border border-line bg-card-solid px-4 py-2.5 text-left text-[12.5px] font-semibold shadow-[0_2px_6px_rgba(18,20,17,0.05),0_18px_44px_rgba(18,20,17,0.10)]" style={{ animationDelay: "-2s" }}>
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-pill text-[13px] text-bg">✨</span>
            <span>One unseen gem<small className="block font-medium text-mut">in every Top 3</small></span>
          </div>
        </div>
        <div className="relative z-[2] mx-auto max-w-4xl text-center">
          {/* โลโก้เต็มตัว (เครื่องบิน + gradient G + ธง + tagline) — พระเอกของ hero */}
          <div className="gn-rise mb-8">
            <Logo tagline className="text-[clamp(38px,6vw,52px)]" />
          </div>
          <span className="gn-rise o-mono inline-block rounded-full bg-tint px-4 py-1.5 text-[11px] text-ink">
            🎉 Beta · free while we test
          </span>
          <h1 className="o-serif gn-rise gn-d1 mt-6 text-4xl font-light leading-[1.12] sm:text-[54px]" style={{ textWrap: "balance" }}>
            Plan a full day out
            <br />
            <span className="whitespace-nowrap"><em className="o-marker">know every baht</em> before you leave</span>
          </h1>
          <p className="gn-rise gn-d1 mx-auto mt-6 max-w-xl text-lg text-ink/80">
            Top 3 picks for your vibe, validated by real visitors — win bikes, boats and BTS all in one budget
          </p>
          <div className="gn-rise gn-d1">
            <Link
              href="/app"
              className="gn-press gn-cta o-pill-primary o-btn-label mt-8 inline-block px-8 py-3.5 text-base"
            >
              Start planning free ▶
            </Link>
            <p className="mt-3 text-xs text-ink/60">No sign-up · works right away</p>
          </div>

          {/* ask-style bar — ลิงก์ไป /app เฉยๆ ไม่ใช่ AI chat จริง (Mindtrip signature element) */}
          <Link
            href="/app"
            className="gn-press gn-rise gn-d1 o-grain group mx-auto mt-10 flex max-w-lg items-center gap-3 rounded-full border border-line bg-bg px-5 py-3.5 text-left shadow-[0_2px_6px_rgba(18,20,17,.05),0_18px_44px_rgba(18,20,17,.1)] transition-shadow hover:shadow-[0_4px_10px_rgba(18,20,17,.07),0_26px_56px_rgba(18,20,17,.14)]"
          >
            <span className="min-w-0 flex-1 truncate text-[15px] text-mut">Where to this Saturday, 450฿ budget…</span>
            <span className="gn-pulse-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base text-white">
              ↑
            </span>
          </Link>
        </div>
      </section>

      {/* (9) marquee ticker — ทุกตัวเลขตรง fixtures จริง (R003/R001/R005 + กติกา unseen) */}
      <div className="overflow-hidden border-y-[1.5px] border-ink bg-bg py-2.5">
        <div className="gn-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="o-mono flex gap-12 whitespace-nowrap pr-12 text-[11px] text-ink">
              <span>LAT PHRAO → SIAM · BTS <b className="text-accent">44฿</b></span>
              <span>BANG KAPI → SIAM · WIN+BOAT <b className="text-accent">47฿</b></span>
              <span>ON NUT → SIAM · BTS <b className="text-accent">37฿</b></span>
              <span><b>✦ UNSEEN</b> NEEDS 3+ REAL CONFIRMATIONS</span>
              <span>RAIN? REPLAN INDOOR-ONLY · SAME BUDGET</span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="o-serif text-center text-3xl font-medium text-ink">
          Ever blown your budget on a day out?
        </h2>
        <p className="mt-3 text-center text-mut">
          The three problems every Bangkok day trip has
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "💸", title: "Budget blowouts", desc: "You budget for food, then forget the boat, the win bike, the BTS" },
            { icon: "🤷", title: "Nowhere to go", desc: "30 minutes of searching and still no decision" },
            { icon: "📍", title: "Same famous spots", desc: "Everyone goes viral places — hidden gems stay hidden" },
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
            Three steps, that's it
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { num: "01", title: "Pick your vibe", desc: "Work session / date / family day / photo walk" },
              { num: "02", title: "Choose from Top 3", desc: "2 proven hits + 1 hidden gem, with prices and routes" },
              { num: "03", title: "See plan + total budget", desc: "Win, boat, walk — one number, instantly see what's left" },
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
          Why the numbers are right
        </h2>
        <div className="mt-8 space-y-3">
          {[
            { icon: "✅", text: "Validated by real visitors — prices locals actually pay, not travel-site prices" },
            { icon: "🏛", text: "Unseen spots from TAT open data — gems before they trend" },
            { icon: "🗺", text: "Real routes — win bikes, Saen Saep boats, songthaews, field-collected" },
            { icon: "☔", text: "Replan on the spot — raining? We find indoor spots within what's left" },
            { icon: "🔒", text: "PDPA compliant — delete anytime, never sold" },
          ].map((f) => (
            <div key={f.text} className="gn-card-e flex items-start gap-3 p-4">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm text-ink">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — พื้น gradient เขียวสดตามต้นแบบ (plan §3), ไม่ใช้ o-ambience-* เดิม (นั่นคือ pastel ของ mood tiles) */}
      <section
        className="o-grain relative px-6 py-16 text-center text-ink"
        style={{ background: "linear-gradient(160deg, #2db3a4, #41b982 55%, #6ccf63)" }}
      >
        <div className="relative z-[2]">
          <h2 className="o-serif text-3xl font-medium">
            <em className="o-marker">Try planning this Saturday</em>
          </h2>
          <p className="mt-2 text-ink/80">Free · no sign-up · works right away</p>
          <Link href="/app" className="gn-press gn-cta o-pill-primary o-btn-label mt-6 inline-block px-8 py-3.5 text-base">
            Start now ▶
          </Link>
          <p className="mt-10 text-sm font-semibold text-ink/90">
            Not your neighborhood yet? Leave a contact — hear first when new zones open
          </p>
          <WaitlistForm source="landing_cta" />
        </div>
      </section>

      <footer className="o-mono-text bg-bg px-6 py-8 text-center text-xs text-mut">
        <p>GoNai — plan · go · never over budget</p>
        <p className="mt-1">Beta · sample data — real Siam data landing with the W2 field sprint</p>
      </footer>
    </div>
  );
}