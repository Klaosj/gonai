import { NextRequest, NextResponse } from "next/server";
import { exchangeLineCode } from "@/lib/auth";
import { ensureUser, getStore, persist, wipeUser } from "@/lib/store";

// LINE Login callback — รับ code จาก LINE แล้วแลกเป็น token + profile
// 1. แลก code → LINE profile (userId, displayName, pictureUrl)
// 2. migrate: ย้ายข้อมูลจาก device id เดิม → LINE user id
// 3. set cookie httpOnly (line_user_id, line_display_name, line_picture_url)
// 4. redirect ไป returnPath (จาก state)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const error = sp.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/app?auth_error=line", req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app?auth_error=missing_params", req.url));
  }

  try {
    const { userId, displayName, pictureUrl, returnPath } = await exchangeLineCode(code, state);

    // migrate: ย้ายข้อมูลจาก device id เดิม (ถ้ามี) → LINE user id
    const oldDeviceId = req.headers.get("x-gn-user");
    if (oldDeviceId && oldDeviceId !== "anon" && oldDeviceId !== userId) {
      const store = getStore();
      // ย้าย plans
      for (const [pid, p] of Object.entries(store.plans)) {
        if (p.user_id === oldDeviceId) {
          store.plans[pid].user_id = userId;
        }
      }
      // ย้าย saves
      for (const s of store.saves) {
        if (s.user_id === oldDeviceId) s.user_id = userId;
      }
      // ย้าย events
      for (const e of store.events) {
        if (e.user_id === oldDeviceId) e.user_id = userId;
      }
      // ย้าย imports
      for (const i of store.imports) {
        if (i.user_id === oldDeviceId) i.user_id = userId;
      }
      // ลบ user เดิม
      delete store.users[oldDeviceId];
      persist();
    }

    // ensure user ใหม่
    ensureUser(userId);

    // set cookies (httpOnly สำหรับ user id, regular สำหรับ display name/picture)
    const res = NextResponse.redirect(new URL(returnPath, req.url));
    res.cookies.set("line_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 วัน
    });
    if (displayName) {
      res.cookies.set("line_display_name", displayName, {
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (pictureUrl) {
      res.cookies.set("line_picture_url", pictureUrl, {
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (e) {
    console.error("LINE auth error:", e);
    return NextResponse.redirect(new URL("/app?auth_error=exchange_failed", req.url));
  }
}