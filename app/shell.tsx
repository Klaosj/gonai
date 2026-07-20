"use client";
// Shell — header (active tab + avatar) + hint bar + footer — ใช้เฉพาะโซนแอป (/app/*)
// landing (/) ไม่ใช้ Shell — แยกโลก marketing กับแอปออกจากกัน
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/api";

const TABS = [
  { key: "planner", label: "🗺️ วางแผน", href: "/app" },
  { key: "explore", label: "🔎 สำรวจ", href: "/app/explore" },
  { key: "group", label: "👥 กลุ่ม · เร็วๆ นี้", href: "/app/group" },
  { key: "trips", label: "🎒 ทริปของฉัน", href: "/app/me" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/plan") || pathname.startsWith("/app/trip");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("gn_hint_dismissed") === "1") setShowHint(false);
    } catch {}
  }, []);

  // client error reporter — ส่งเข้า events ให้เห็นปัญหาจริงจากเครื่องผู้ใช้ (สูงสุด 1 ครั้ง/30 วิ)
  useEffect(() => {
    let last = 0;
    const report = (message: string) => {
      const now = Date.now();
      if (now - last < 30_000) return;
      last = now;
      track("client_error", { message: message.slice(0, 300), path: window.location.pathname });
    };
    const onError = (e: ErrorEvent) => report(e.message);
    const onReject = (e: PromiseRejectionEvent) => report(String(e.reason).slice(0, 300));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem("gn_hint_dismissed", "1");
    } catch {}
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-gn-line bg-gn-card px-5 py-2.5">
        <Link href="/app" className="flex items-baseline gap-2">
          <b className="gn-serif text-[19px] font-bold text-gn-green">ไปไหน PaiNai</b>
          <span className="text-[11px] text-gn-mut">plan · go · ไม่เกินงบ</span>
        </Link>
        <nav className="ml-2 hidden gap-1 sm:flex">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`rounded-[10px] px-4 py-2 text-sm font-semibold transition ${
                  on ? "bg-gn-green text-white" : "text-gn-mut hover:bg-gn-cream"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto" />
        <Link
          href="/app/me"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gn-orange font-extrabold text-white"
          aria-label="ทริปของฉัน"
        >
          👤
        </Link>
      </header>

      {showHint && (
        <div className="flex items-center gap-3 border-b border-gn-amber-bd bg-gn-amber-bg px-5 py-2 text-[13px] text-gn-amber-fg">
          <span>
            💡 <b className="text-gn-orange">วิธีใช้:</b>&nbsp; ① เลือกย่านที่ออก + เงื่อนไข → ② เลือกจาก Top 3 ที่คัดให้
            → ③ เห็นแผน + งบรวมทุกบาท — พอออกเดินทางจริง กด &quot;เริ่มเที่ยว&quot; เพื่อบันทึกจ่ายจริง
          </span>
          <button
            onClick={dismissHint}
            className="ml-auto rounded-lg border border-gn-amber-bd bg-gn-card px-3 py-1 text-xs font-semibold text-gn-amber-fg"
          >
            เข้าใจแล้ว ✕
          </button>
        </div>
      )}

      {children}

      <footer className="flex flex-wrap justify-center gap-5 border-t border-gn-line bg-gn-card px-5 py-3.5 text-xs text-gn-mut">
        <span>🚧 เบต้า — ข้อมูลชุดตัวอย่าง กำลังเก็บข้อมูลจริงย่านสยาม</span>
        <span>✨ ที่ Unseen ต้องมีคนยืนยัน ≥ 3 คนถึงจะโชว์</span>
        <span>🗺 เส้นทางวิน/เรือ/BTS เก็บภาคสนาม · ที่ยังไม่ validate ใช้สูตร Grab</span>
        <span>🔒 ข้อมูลส่วนตัวตาม PDPA — ดู/ลบได้ทุกเมื่อ</span>
      </footer>
    </>
  );
}
