import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

// Logout — ล้าง cookie ตัวตน → request ถัดไปได้ตัวตน anonymous ใหม่
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
