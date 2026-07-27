"use client";
// client wrapper ให้ landing (server component) ใช้ useReveal ได้ — ครอบ section ที่อยากให้เล่น
// gn-rise ตอน scroll ถึงจอ (ไม่ใช่ตอน mount เหมือน hero)
import { useReveal } from "@/lib/use-reveal";

export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref}>{children}</div>;
}
