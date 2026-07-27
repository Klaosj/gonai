// error.tsx — error boundary ทั้งแอปในแบรนด์ (คู่กับ client_error reporter เดิมใน Shell)
// ครอบทุกอย่างใต้ root layout เท่านั้น (ไม่ใช่ global-error.tsx) — header/nav ยังอยู่ ไม่หลุดออกนอก shell
"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl">🛬</p>
      <h1 className="o-serif text-[22px] font-medium text-ink">Something went off-route</h1>
      <p className="text-sm text-mut">The error is on us — your plan data is safe.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="gn-press o-pill-primary o-btn-label px-5 py-2.5 text-sm">
          Try again
        </button>
        <a href="/app" className="gn-press o-pill-dark o-btn-label px-5 py-2.5 text-sm">
          Back to planner
        </a>
      </div>
    </main>
  );
}
