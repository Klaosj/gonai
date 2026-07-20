"use client";
// Shell — header (active tab + budget chip + avatar) + hint bar + footer
// อ้างอิง painai-app-v3.html เป๊ะ: 4 tabs · sticky header · hint bar dismissible · footer 4 chips
// font class variables (--font-noto, --font-playfair) ถูก apply ที่ <html> ใน app/layout.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { key: "planner", label: "🗺️ วางแผน", href: "/app" },
  { key: "explore", label: "🔎 สำรวจ", href: "/app/explore" },
  { key: "group",   label: "👥 กลุ่ม",   href: "/app/group" },
  { key: "trips",   label: "🎒 ทริปของฉัน", href: "/app/me" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app"
      || pathname.startsWith("/app/plan")
      || pathname.startsWith("/app/trip");
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
  const dismissHint = () => {
    setShowHint(false);
    try { localStorage.setItem("gn_hint_dismissed", "1"); } catch {}
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
        <div className="hidden items-center gap-2 rounded-full border border-gn-mint-bd bg-gn-mint-bg px-3.5 py-1.5 font-bold text-gn-green-dark md:flex">
          <span>💰 งบวันนี้</span>
          <b>800฿</b>
          <small className="font-medium text-gn-mut">ตั้งให้อัตโนมัติจากประวัติ</small>
          <Link href="/app" className="text-gn-green underline">แก้</Link>
        </div>
        <Link
          href="/app/me"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gn-orange font-extrabold text-white"
          aria-label="ทริปของฉัน"
        >
          K
        </Link>
      </header>

      {showHint && (
        <div className="flex items-center gap-3 border-b border-gn-amber-bd bg-gn-amber-bg px-5 py-2 text-[13px] text-gn-amber-fg">
          <span>
            💡 <b className="text-gn-orange">วิธีใช้:</b>&nbsp;
            ① บอก AI ว่าอยากทำอะไร (ซ้าย) → ② เลือกจาก Top 3 ที่คัดให้ (กลาง) → ③ ดูแผน + งบรวม (ขวา) — พอออกเดินทางจริง สลับเป็นโหมด &quot;กำลังเที่ยว&quot; ที่คอลัมน์ขวา
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
        <span>✅ ข้อมูล validate โดยผู้ใช้จริง 128 คนใน 14 วัน</span>
        <span>🏛 สถานที่ unseen จาก TAT open data</span>
        <span>🗺 เส้นทางฐาน GrabMaps + วิน/เรือ/สองแถวเก็บเอง</span>
        <span>🔒 ข้อมูลส่วนตัวตาม PDPA — ดู/ลบได้ทุกเมื่อ</span>
      </footer>
    </>
  );
}
