import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { healthProblem } from "@/lib/health";
import { isSupabaseEnabled } from "@/supabase/store-adapter";

// Health check สำหรับ uptime monitor (เช่น UptimeRobot ฟรี ยิงทุก 5 นาที)
// เช็คว่า catalog โหลดได้จริง — ถ้า Supabase ล่มหรือ config พัง จะตอบ 500
// และถ้า production หลุดมาอยู่บน JSON store (env หาย) → 503 ให้ monitor ร้องทันที
export async function GET() {
  const supa = isSupabaseEnabled();
  const problem = healthProblem(process.env, supa);
  if (problem) {
    return NextResponse.json({ ok: false, store: "json", error: problem }, { status: 503 });
  }
  try {
    const { venues } = await getCatalog();
    return NextResponse.json({
      ok: true,
      store: supa ? "supabase" : "json",
      venues: venues.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
