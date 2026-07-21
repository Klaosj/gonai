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
            <em className="o-marker">Go</em>Nai
          </b>
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
        <div className="relative z-[2] mx-auto max-w-4xl text-center">
          <span className="gn-rise o-mono inline-block rounded-full bg-tint px-4 py-1.5 text-[11px] text-ink">
            🎉 Beta · free while we test
          </span>
          <h1 className="o-serif gn-rise gn-d1 mt-6 text-4xl font-light leading-[1.15] sm:text-6xl">
            Plan a full day out
            <br />
            <em className="o-marker">know every baht</em> before you leave
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
        style={{ background: "linear-gradient(160deg, #34a869, #7fce9f)" }}
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