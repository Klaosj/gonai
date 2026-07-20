import { NextRequest, NextResponse } from "next/server";
import { getLineLoginUrl, isLineConfigured } from "@/lib/auth";

// จุดเริ่ม LINE Login — ปุ่มใน UI ลิงก์มาที่นี่ แล้วเรา redirect ไป LINE
export async function GET(req: NextRequest) {
  if (!isLineConfigured()) {
    return NextResponse.redirect(new URL("/app/me?auth_error=not_configured", req.url));
  }
  const ret = req.nextUrl.searchParams.get("return") ?? "/app/me";
  const returnPath = ret.startsWith("/") ? ret : "/app/me";
  return NextResponse.redirect(getLineLoginUrl(returnPath));
}
