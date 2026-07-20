import { NextRequest, NextResponse } from "next/server";
import { decodeUid, exchangeLineCode, setAuthCookie, setNameCookie, verifyLineState } from "@/lib/auth";
import { store } from "@/lib/store";

// LINE Login callback
// 1. ตรวจ state (HMAC + อายุ 10 นาที — กัน CSRF)
// 2. แลก code → LINE profile
// 3. migrate: ตัวตน anonymous เดิมอ่านจาก signed cookie (มากับ redirect เสมอ) → ย้ายเข้า LINE user id
// 4. เซ็น cookie ใหม่เป็น line:<userId> แล้ว redirect กลับ returnPath
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  if (sp.get("error")) {
    return NextResponse.redirect(new URL("/app/me?auth_error=line", req.url));
  }
  const returnPath = verifyLineState(sp.get("state"));
  if (!code || !returnPath) {
    return NextResponse.redirect(new URL("/app/me?auth_error=bad_state", req.url));
  }

  try {
    const { userId, displayName } = await exchangeLineCode(code);

    // migrate ข้อมูล anonymous เดิม (ถ้ามี) เข้า LINE user id
    const prev = decodeUid(req.cookies.get("gn_uid")?.value);
    if (prev && prev.provider === "anonymous" && prev.id !== userId) {
      await store.migrateUser(prev.id, userId);
    }
    await store.ensureUser(userId);
    await store.addEvent(userId, "line_login", { migrated: !!prev });

    const res = NextResponse.redirect(new URL(returnPath, req.url));
    setAuthCookie(res, userId, "line");
    if (displayName) setNameCookie(res, displayName);
    return res;
  } catch (e) {
    console.error("LINE auth error:", e);
    return NextResponse.redirect(new URL("/app/me?auth_error=exchange_failed", req.url));
  }
}
