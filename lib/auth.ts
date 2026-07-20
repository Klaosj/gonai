// lib/auth.ts
// Auth v1.1 — LINE Login แทน anonymous device id
// อ้างอิง: spec 2.1 (auth v1.1 = LINE Login)
//
// ตอนนี้ (v1): ใช้ anonymous device id (localStorage)
//   - lib/device.ts: getDeviceId() → UUID สุ่ม
//   - API รับผ่าน header x-gn-user
//
// v1.1 (LINE Login):
//   - ผู้ใช้ล็อกอินผ่าน LINE → ได้ LINE user id
//   - เก็บ LINE access token ใน httpOnly cookie
//   - API อ่าน user id จาก cookie (ไม่ใช่ header อีกต่อไป)
//   - migrate: device id เดิม → LINE user id (ย้าย plans/saves/events)
//
// วิธีเปิดใช้:
//   1. สร้าง LINE Login channel ที่ LINE Developers Console
//   2. ตั้ง LINE_CHANNEL_ID + LINE_CHANNEL_SECRET ใน .env
//   3. ตั้ง callback URL: https://yourdomain.com/api/auth/line/callback
//   4. ผู้ใช้กด "ล็อกอินด้วย LINE" → redirect ไป LINE → callback → set cookie

import type { NextRequest } from "next/server";

export interface AuthUser {
  id: string;          // LINE user id หรือ device id (fallback)
  provider: "line" | "anonymous";
  displayName?: string;
  pictureUrl?: string;
}

// อ่าน user id จาก request — ลอง cookie ก่อน (LINE), fallback เป็น header (anon)
export function getUserFromRequest(req: NextRequest): AuthUser {
  // v1.1: ลองอ่านจาก cookie ก่อน
  const lineUserId = req.cookies.get("line_user_id")?.value;
  if (lineUserId) {
    return {
      id: lineUserId,
      provider: "line",
      displayName: req.cookies.get("line_display_name")?.value,
      pictureUrl: req.cookies.get("line_picture_url")?.value,
    };
  }
  // v1: fallback เป็น header x-gn-user (anonymous device id)
  const anonId = req.headers.get("x-gn-user") ?? "anon";
  return { id: anonId, provider: "anonymous" };
}

// LINE Login URL — redirect ผู้ใช้ไปที่นี่
export function getLineLoginUrl(returnPath: string = "/app"): string {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new Error("LINE_CHANNEL_ID not set");
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/line/callback`;
  const state = Buffer.from(JSON.stringify({ returnPath, ts: Date.now() })).toString("base64url");
  return (
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code` +
    `&client_id=${channelId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=profile%20openid`
  );
}

// แลก code เป็น LINE access token + profile
export async function exchangeLineCode(code: string, returnState: string) {
  const channelId = process.env.LINE_CHANNEL_ID!;
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/line/callback`;

  // 1. แลก code → token
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });
  if (!tokenRes.ok) throw new Error(`LINE token error: ${tokenRes.status}`);
  const token = await tokenRes.json();

  // 2. ดึง profile
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`LINE profile error: ${profileRes.status}`);
  const profile = await profileRes.json();

  // 3. decode state เพื่อเอา returnPath
  let returnPath = "/app";
  try {
    const decoded = JSON.parse(Buffer.from(returnState, "base64url").toString());
    returnPath = decoded.returnPath ?? "/app";
  } catch {}

  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    returnPath,
  };
}

// migrate: ย้ายข้อมูลจาก device id เดิม → LINE user id
export async function migrateUser(oldDeviceId: string, newLineUserId: string): Promise<void> {
  // TODO: เรียก store.wipeUser หลังย้ายข้อมูล
  // ตอนนี้ทำใน lib/store.ts ผ่าน wipeUser + re-ensure
  // ใน production ใช้ SQL: UPDATE plans SET user_id = ? WHERE user_id = ?
}