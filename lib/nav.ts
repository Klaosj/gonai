// nav.ts — TABS + isActive ย้ายมาจาก app/shell.tsx (T2.2) เพื่อให้ components/BottomTabBar.tsx
// import ได้โดยไม่ import วนกลับเข้า shell.tsx · logic เดิมทุกตัวอักษร ไม่มีการปรับปรุงระหว่างย้าย
export const TABS = [
  { key: "planner", label: "🗺️ Plan", href: "/app" },
  { key: "explore", label: "🔎 Explore", href: "/app/explore" },
  { key: "group", label: "👥 Group · soon", href: "/app/group" },
  { key: "trips", label: "🎒 My trips", href: "/app/me" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/plan") || pathname.startsWith("/app/trip");
  }
  return pathname === href || pathname.startsWith(href + "/");
}
