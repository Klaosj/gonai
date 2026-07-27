"use client";
// วน Tab ใน dialog (bottom sheet / modal) + คืน focus ให้ตัวเปิดตอนปิด
// เขียนเอง ไม่เพิ่ม dependency — ตามแผน fe3.1 (docs/superpowers/plans/2026-07-26-frontend-full-sweep.md §558)
import { useEffect, useRef } from "react";

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [active]);
  return ref;
}
