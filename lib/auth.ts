// Auth — server-issued signed cookie (แก้ช่อง spoofing ของ x-gn-user header เดิม)
//
// หลักการ:
//   - user id อยู่ใน cookie `gn_uid` รูปแบบ `<provider>:<id>.<hmac>` (httpOnly, signed)
//   - client ปลอม id ไม่ได้เพราะไม่มี GN_AUTH_SECRET — ปิดช่องอ่าน/ลบข้อมูลคนอื่น
//   - request แรกที่ไม่มี cookie → ออก id ใหม่ แล้วผู้เรียกต้อง attachAuth() ตอนตอบ
//   - LINE Login สำเร็จ → cookie เดิมถูกแทนด้วย `line:<LINE user id>` (ดู api/auth/line/*)
//
// env: GN_AUTH_SECRET (บังคับใน production), LINE_CHANNEL_ID + LINE_CHANNEL_SECRET (ถ้าเปิด LINE)
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

const UID_COOKIE = "gn_uid";
const NAME_COOKIE = "gn_name"; // display name — ไม่ httpOnly ให้ UI อ่านได้ ไม่ใช่ข้อมูลยืนยันตัวตน
const UID_MAX_AGE = 60 * 60 * 24 * 365;
const STATE_MAX_AGE_MS = 10 * 60_000; // LINE state หมดอายุ 10 นาที

export type Provider = "line" | "anonymous";

export interface AuthUser {
  id: string;
  provider: Provider;
  isNew: boolean; // เพิ่งออก id ใหม่ — response ต้องผ่าน attachAuth() ไม่งั้น id หลุดมือ
}

function secret(): string {
  const s = process.env.GN_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("GN_AUTH_SECRET not set");
  return "gonai-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, sig: string): boolean {
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encodeUid(id: string, provider: Provider): string {
  const value = `${provider}:${id}`;
  return `${value}.${sign(value)}`;
}

export function decodeUid(cookie: string | undefined): { id: string; provider: Provider } | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const value = cookie.slice(0, dot);
  if (!verify(value, cookie.slice(dot + 1))) return null;
  const colon = value.indexOf(":");
  const provider = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if ((provider !== "line" && provider !== "anonymous") || !id) return null;
  return { id, provider };
}

export function resolveUser(req: NextRequest): AuthUser {
  const decoded = decodeUid(req.cookies.get(UID_COOKIE)?.value);
  if (decoded) return { ...decoded, isNew: false };
  return { id: randomUUID(), provider: "anonymous", isNew: true };
}

export function setAuthCookie(res: NextResponse, id: string, provider: Provider) {
  res.cookies.set(UID_COOKIE, encodeUid(id, provider), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: UID_MAX_AGE,
    path: "/",
  });
}

export function setNameCookie(res: NextResponse, name: string) {
  res.cookies.set(NAME_COOKIE, name, { sameSite: "lax", maxAge: UID_MAX_AGE, path: "/" });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(UID_COOKIE);
  res.cookies.delete(NAME_COOKIE);
}

export function displayNameFrom(req: NextRequest): string | null {
  return req.cookies.get(NAME_COOKIE)?.value ?? null;
}

// ติด cookie ให้ response เมื่อเพิ่งออก id ใหม่ — ทุก route ต้องห่อ response ด้วยตัวนี้
export function attachAuth<T extends NextResponse>(res: T, auth: AuthUser): T {
  if (auth.isNew) setAuthCookie(res, auth.id, auth.provider);
  return res;
}

// ===== LINE Login (v1.1) =====

export function isLineConfigured(): boolean {
  return !!process.env.LINE_CHANNEL_ID && !!process.env.LINE_CHANNEL_SECRET;
}

function lineRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/line/callback`;
}

// state เซ็นด้วย HMAC กัน CSRF — callback รับเฉพาะ state ที่เราออกเองใน 10 นาที
export function getLineLoginUrl(returnPath: string = "/app"): string {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new Error("LINE_CHANNEL_ID not set");
  const payload = Buffer.from(JSON.stringify({ returnPath, ts: Date.now() })).toString("base64url");
  const state = `${payload}.${sign(payload)}`;
  return (
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code` +
    `&client_id=${channelId}` +
    `&redirect_uri=${encodeURIComponent(lineRedirectUri())}` +
    `&state=${state}` +
    `&scope=profile%20openid`
  );
}

// คืน returnPath ถ้า state ถูกต้องและยังไม่หมดอายุ — ไม่งั้น null
export function verifyLineState(state: string | null): string | null {
  if (!state) return null;
  const dot = state.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = state.slice(0, dot);
  if (!verify(payload, state.slice(dot + 1))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as { returnPath?: string; ts?: number };
    if (!decoded.ts || Date.now() - decoded.ts > STATE_MAX_AGE_MS) return null;
    const path = decoded.returnPath ?? "/app";
    return path.startsWith("/") ? path : "/app";
  } catch {
    return null;
  }
}

// แลก code เป็น LINE profile
export async function exchangeLineCode(code: string): Promise<{
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
}> {
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: lineRedirectUri(),
      client_id: process.env.LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  });
  if (!tokenRes.ok) throw new Error(`LINE token error: ${tokenRes.status}`);
  const token = await tokenRes.json();

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`LINE profile error: ${profileRes.status}`);
  const profile = await profileRes.json();

  return {
    userId: profile.userId,
    displayName: profile.displayName ?? null,
    pictureUrl: profile.pictureUrl ?? null,
  };
}
