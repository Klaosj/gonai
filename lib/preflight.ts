// preflight.ts — ตรวจความพร้อม env ก่อน deploy production
// pure function ล้วน ไม่แตะ network — live check หลัง deploy ใช้ /api/health
export type PreflightCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  hint: string;
};

export function preflightChecks(env: Record<string, string | undefined>): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  const secret = env.GN_AUTH_SECRET ?? "";
  checks.push({
    name: "GN_AUTH_SECRET",
    ok: secret.length >= 32 && !secret.startsWith("change-me"),
    required: true,
    hint: "สร้างด้วย: openssl rand -base64 32 (ต้อง ≥32 ตัวอักษร)",
  });

  checks.push({
    name: "SUPABASE_URL",
    ok: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL ?? ""),
    required: true,
    hint: "URL โปรเจค Supabase เช่น https://xxxx.supabase.co",
  });

  checks.push({
    name: "SUPABASE_SERVICE_KEY",
    ok: (env.SUPABASE_SERVICE_KEY ?? "").length > 20,
    required: true,
    hint: "service role key จาก Supabase dashboard",
  });

  checks.push({
    name: "NEXT_PUBLIC_BASE_URL",
    ok: (env.NEXT_PUBLIC_BASE_URL ?? "").startsWith("https://"),
    required: true,
    hint: "โดเมนจริงขึ้นต้น https:// (ใช้สร้าง LINE callback URL)",
  });

  const lineId = env.LINE_CHANNEL_ID ?? "";
  const lineSecret = env.LINE_CHANNEL_SECRET ?? "";
  checks.push({
    name: "LINE_CHANNEL_ID/SECRET",
    ok: !!lineId === !!lineSecret,
    required: false,
    hint: "ตั้งคู่กันหรือไม่ตั้งเลย — ตั้งครึ่งเดียว = login พังแบบเงียบ",
  });

  checks.push({
    name: "ANTHROPIC_API_KEY",
    ok: !!env.ANTHROPIC_API_KEY,
    required: false,
    hint: "ไม่ตั้ง = chat ใช้ quick parser (ใช้ได้ แต่ฉลาดน้อยกว่า)",
  });

  return checks;
}
