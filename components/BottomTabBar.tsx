"use client";
// BottomTabBar — nav มือถือ < sm (การตัดสินใจ Klao ข้อ 1, T2.2 ปิด P0: มือถือเข้า nav ไม่ได้เลย)
// TABS/isActive มาจาก lib/nav.ts (shared กับ header desktop ใน app/shell.tsx) — ห้ามเปลี่ยน label ที่นั่น
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "@/lib/nav";

// label เต็มยาวเกินไปสำหรับ bottom tab ที่จอ 360–390px ("👥 Group · soon" / "🎒 My trips" ล้น/ตัดคำน่าเกลียด)
// ย่อเฉพาะการแสดงผลใน bottom bar เท่านั้น — TABS.label เดิม (ใช้ใน header desktop) ไม่ถูกแตะ
// คงความหมาย "ยังไม่เปิดใช้งาน" ของ Group ไว้ด้วย "soon" สั้นๆ แทน "· soon"
const MOBILE_LABELS: Record<(typeof TABS)[number]["key"], string> = {
  planner: "🗺️ Plan",
  explore: "🔎 Explore",
  group: "👥 Group soon",
  trips: "🎒 My trips",
};

export function BottomTabBar() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[110] flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {TABS.map((t) => {
        const on = isActive(pathname, t.href);
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex-1 py-2.5 text-center text-[11px] leading-tight ${on ? "font-semibold text-accent" : "text-mut"}`}
          >
            {MOBILE_LABELS[t.key]}
          </Link>
        );
      })}
    </nav>
  );
}
