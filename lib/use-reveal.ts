"use client";
// เติมคลาสเมื่อ element เข้าจอ (gn-rise เล่นตอน scroll ถึง ไม่ใช่ตอน mount)
// guard reduced-motion ต้องมาก่อนบรรทัด opacity:0 เสมอ — ถ้าสลับลำดับ เนื้อหาจะค้าง opacity:0
// สำหรับผู้ใช้ reduced-motion เพราะ IntersectionObserver จะไม่ถูกสร้างเลย (T4.3)
import { useEffect, useRef } from "react";

export function useReveal<T extends HTMLElement>(cls = "gn-rise") {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.opacity = "0";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.style.opacity = "";
          el.classList.add(cls);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cls]);
  return ref;
}
