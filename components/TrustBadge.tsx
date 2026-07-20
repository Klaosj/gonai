// Trust badge — แก้ AI trust gap · stale ที่ 45 วันตาม Gap Fix D
import { STALE_DAYS } from "@/lib/fixtures";

export default function TrustBadge({ lastValidatedAt, count }: { lastValidatedAt: string; count: number }) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastValidatedAt).getTime()) / 86_400_000));
  const stale = days > STALE_DAYS;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${stale ? "text-mut" : "text-ok"}`}>
      {!stale && <span>✓</span>}
      <span>
        อัปเดต {days} วันก่อน · validate โดยคนจริง {count} ครั้ง
      </span>
    </span>
  );
}
