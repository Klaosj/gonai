// สถานะป้ายความเชื่อมั่น — pure function แยกจาก TrustBadge เพื่อ test ตรง
// ลำดับตัดสิน: stale (เกิน staleDays) > unverified (count 0) > confirmed
export type TrustState =
  | { kind: "stale"; days: number }
  | { kind: "unverified"; days: number }
  | { kind: "confirmed"; days: number; dots: number };

export function trustState(
  lastValidatedAt: string,
  count: number,
  now: number,
  staleDays: number,
): TrustState {
  const days = Math.max(0, Math.floor((now - new Date(lastValidatedAt).getTime()) / 86_400_000));
  if (days > staleDays) return { kind: "stale", days };
  if (count < 1) return { kind: "unverified", days };
  return { kind: "confirmed", days, dots: Math.min(3, count) };
}
