import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { isSupabaseEnabled } from "@/supabase/store-adapter";

// Health check สำหรับ uptime monitor (เช่น UptimeRobot ฟรี ยิงทุก 5 นาที)
// เช็คว่า catalog โหลดได้จริง — ถ้า Supabase ล่มหรือ config พัง จะตอบ 500
export async function GET() {
  try {
    const { venues } = await getCatalog();
    return NextResponse.json({
      ok: true,
      store: isSupabaseEnabled() ? "supabase" : "json",
      venues: venues.length,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
