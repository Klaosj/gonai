import { NextRequest, NextResponse } from "next/server";
import { addEvent, ensureUser, getStore, persist } from "@/lib/store";

// v1: เก็บลิงก์ + ให้ทีมงานดึงข้อมูลใน 24 ชม. — ห้าม scrape (spec 2.11)
export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  ensureUser(uid);
  const { url } = (await req.json()) as { url: string };
  if (!url) return new NextResponse("url required", { status: 400 });

  const platform = url.includes("tiktok") ? "tiktok" : "ig";
  getStore().imports.push({
    user_id: uid,
    url,
    platform,
    status: "queued",
    created_at: new Date().toISOString(),
  });
  persist();
  addEvent(uid, "import_link", { url, platform });
  return NextResponse.json({ ok: true });
}
