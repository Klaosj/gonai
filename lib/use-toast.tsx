"use client";
// toast กลาง: host เดียวใน Shell แทน markup ที่ copy 4 หน้า (planner-client / plan/[id] / me / explore)
// markup/className ลอกจากของจริงที่ 4 หน้าเหมือนกันทุกตัวอักษร — ไม่ใช่ร่างในแผน
import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" className="gn-toast fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-full bg-card-solid px-5 py-2.5 text-[13px] text-ink sm:bottom-[26px]">
          {toast}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
