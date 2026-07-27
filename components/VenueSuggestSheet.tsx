"use client";
// VenueSuggestSheet — bottom sheet เลือกร้าน รวมจาก 2 ที่เดิม (T1.6):
// planner-client.tsx (chain sheet) + plan/[id]/page.tsx (replan sheet)
// indoorReason ควบคุม empty-state message: true = ข้อความตามเวลาจริง (ของเดิมฝั่ง replan)
// false/undefined = ข้อความคงที่ (ของเดิมฝั่ง chain) — logic/className/ข้อความเดิมทุกตัวอักษรตามแต่ละที่
import { mid } from "@/lib/costing";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { Venue } from "@/lib/types";

interface VenueSuggestSheetProps {
  title: string;
  list: Venue[];
  indoorReason?: boolean; // replan ฝน: โชว์เหตุผล indoor + empty message ตามเวลาจริง
  adding: string | null; // venue id ที่กำลัง add (busy state) — ผู้เรียกทั้ง 2 ที่เดิมยังไม่ track ค่านี้ (ส่ง null เสมอ)
  onAdd: (v: Venue) => void;
  onClose: () => void;
  ariaLabel: string; // aria-label เดิมต่างกันคนละที่ ("Next stop suggestions" / "Replan suggestions")
}

export function VenueSuggestSheet({ title, list, indoorReason, adding, onAdd, onClose, ariaLabel }: VenueSuggestSheetProps) {
  const sheetRef = useFocusTrap<HTMLDivElement>(true); // sheet ถูก mount ตอนเปิดเท่านั้น (parent เงื่อนไข chainList/replanList && ...) — active คงที่ true
  return (
    <>
      <div className="gn-backdrop fixed inset-0 z-[29] bg-ink/20" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        ref={sheetRef}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="outline-none gn-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-3xl border border-b-0 border-line bg-card-solid p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-sm text-mut">
            Close
          </button>
        </div>
        {list.length === 0 && (
          <p className="text-sm text-mut">
            {indoorReason
              ? (() => {
                  const h = parseInt(
                    new Intl.DateTimeFormat("en-GB", {
                      timeZone: "Asia/Bangkok",
                      hour: "2-digit",
                      hour12: false,
                    }).format(new Date()),
                    10,
                  );
                  return h >= 22 || h < 8
                    ? "Everything nearby is closed now — heading home is fine too"
                    : "Not enough budget left for nearby spots — heading home is fine too";
                })()
              : "Nothing open within what's left — heading home is fine too"}
          </p>
        )}
        <ul className="space-y-2">
          {list.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elev p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{v.name_th}</p>
                <p className="text-xs text-mut">~{mid(v.price_per_head_min, v.price_per_head_max)}฿/person</p>
              </div>
              <button
                onClick={() => onAdd(v)}
                disabled={adding === v.id}
                className="gn-press o-pill-primary o-btn-label shrink-0 px-3 py-1.5 text-sm"
              >
                {adding === v.id ? <span className="gn-spinner" /> : "+ Add"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
