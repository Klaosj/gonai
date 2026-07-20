"use client";

// ตัวตนผู้ใช้อยู่ใน httpOnly cookie ที่ server เซ็นเอง (ดู lib/auth.ts)
// — browser แนบ cookie ให้อัตโนมัติ ไม่ต้องส่ง header อะไรเพิ่ม
export async function gn<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Event taxonomy ตาม spec 2.9 — fire-and-forget
export function track(type: string, payload: Record<string, unknown> = {}) {
  gn("/api/events", { method: "POST", body: JSON.stringify({ type, payload }) }).catch(() => {});
}
