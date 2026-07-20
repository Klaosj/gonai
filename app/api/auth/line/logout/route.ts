import { NextRequest, NextResponse } from "next/server";

// LINE logout — ลบ cookies แล้ว redirect กลับ /app
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("line_user_id");
  res.cookies.delete("line_display_name");
  res.cookies.delete("line_picture_url");
  return res;
}