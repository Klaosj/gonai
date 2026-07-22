// Share link แบบ view-only — token = HMAC(plan id) ไม่ต้องแก้ schema
// รู้ลิงก์ = เปิดดูได้ (อ่านอย่างเดียว ไม่มีข้อมูลเจ้าของ) · เดา id เฉยๆ เปิดไม่ได้เพราะไม่มี token
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.GN_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("GN_AUTH_SECRET not set");
  return "gonai-dev-secret";
}

export function shareToken(planId: string): string {
  return createHmac("sha256", secret()).update(`share:${planId}`).digest("base64url").slice(0, 20);
}

export function verifyShareToken(planId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(shareToken(planId));
  const got = Buffer.from(token);
  return got.length === expected.length && timingSafeEqual(expected, got);
}

export function sharePath(planId: string): string {
  return `/p/${planId}?k=${shareToken(planId)}`;
}
