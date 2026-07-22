// Trust badge — social proof จากข้อมูล validate จริง (แก้ AI trust gap · stale ที่ 45 วันตาม Gap Fix D)
// อัพเกรดจากบรรทัด text เล็กเป็น pill เด่นแบบ "Confirmed by N travelers" — ตัวเลขคือ validation_count จริง
import { STALE_DAYS } from "@/lib/fixtures";

export default function TrustBadge({ lastValidatedAt, count }: { lastValidatedAt: string; count: number }) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastValidatedAt).getTime()) / 86_400_000));
  const stale = days > STALE_DAYS;

  if (stale) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid/60 px-2.5 py-1 text-[11px] text-mut">
        Last checked {days}d ago — reconfirming
      </span>
    );
  }

  // วงกลม ✓ ซ้อนกันแทน avatar — เราไม่มีรูปผู้ใช้จริง เลยไม่แกล้งทำเป็นมี
  const dots = Math.min(3, Math.max(1, count));
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-tint px-2.5 py-1 text-[11.5px] font-semibold text-accent">
      <span className="flex -space-x-1.5" aria-hidden>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-bg bg-accent text-[8px] text-bg"
            style={{ opacity: 1 - i * 0.25 }}
          >
            ✓
          </span>
        ))}
      </span>
      Confirmed by {count} traveler{count === 1 ? "" : "s"}
      <span className="font-normal text-accent/70">· {days}d ago</span>
    </span>
  );
}
