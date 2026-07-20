// Rate limit แบบ sliding window ใน memory — กัน spam เบื้องต้น
// ข้อจำกัด: ต่อ instance (serverless หลาย instance = เพดานรวมสูงกว่าที่ตั้ง)
// พอสำหรับ MVP — ถ้า scale ค่อยย้ายไป Upstash/Redis
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (hits.size > MAX_KEYS) hits.clear(); // กัน memory โตไม่จำกัด — reset หยาบๆ ยอมรับได้สำหรับ guard
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimits() {
  hits.clear();
}
