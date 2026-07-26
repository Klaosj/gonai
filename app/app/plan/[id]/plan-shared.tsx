// /app/plan/[id]/plan-shared.tsx — ฟังก์ชัน/คอมโพเนนต์เล็กที่ plan-view.tsx และ trip-view.tsx ใช้ร่วมกัน
// ย้ายจาก page.tsx เดิม (T1.5 แตกไฟล์) — logic/className/ข้อความเดิมทุกตัวอักษร ไม่มีแก้
import { MODE_LABELS, type Route, type Venue } from "@/lib/types";

// สรุปเส้นทางจาก data จริง — แทน string hardcode เดิม (ถูกเฉพาะบางกะปิ)
export function legsSummary(r: Route) {
  const modes = [...new Set(r.legs.map((l) => MODE_LABELS[l.mode]))].join("+");
  const min = r.legs.reduce((s, l) => s + l.price_min, 0);
  const max = r.legs.reduce((s, l) => s + l.price_max, 0);
  const mins = r.legs.reduce((s, l) => s + l.minutes, 0);
  return { modes, price: min === max ? `${min}฿` : `~${min}-${max}฿`, mins };
}

export function mapsUrl(v: Venue) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name_th} สยาม กรุงเทพ`)}`;
}

export function fmtTimeBKK(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// ปุ่มคู่ "ตามประเมิน / พิมพ์เอง" — ใช้ร่วมกันระหว่างการ์ดจุดปัจจุบัน + แถว timeline
export function SpendPrompt({ estCost, busy = false, onQuick, onCustom }: { estCost: number; busy?: boolean; onQuick: () => void; onCustom: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onQuick} className="gn-press o-pill-primary o-btn-label flex-1 py-2 text-sm">
        {busy ? <><span className="gn-spinner" />Saving…</> : `As estimated ${estCost}฿`}
      </button>
      <button onClick={onCustom} className="gn-press o-pill-dark o-btn-label flex-1 py-2 text-sm">
        Type amount…
      </button>
    </div>
  );
}

// ช่องกรอกจำนวนเงินเอง — Enter to save (logic เดิม ย้ายมาใช้ร่วมกัน)
export function SpendInput({ onSave, onClose }: { onSave: (amount: number) => void; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        autoFocus
        placeholder="฿"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = parseInt((e.target as HTMLInputElement).value, 10);
            if (n >= 0) onSave(n);
            onClose();
          }
          if (e.key === "Escape") onClose();
        }}
        className="w-28 rounded-full border border-line bg-bg px-3 py-2 text-sm text-ink"
      />
      <span className="text-xs text-mut">Enter to save</span>
      <button onClick={onClose} className="ml-auto text-xs text-mut underline">
        Cancel
      </button>
    </div>
  );
}
