"use client";
import { getDeviceId } from "./device";

export async function gn<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-gn-user": getDeviceId(),
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
