import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { attachAuth, resolveUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

// v1: เก็บลิงก์ + ให้ทีมงานดึงข้อมูลใน 24 ชม. — ห้าม scrape (spec 2.11)
// คิวนี้เป็นแรงงานคนจริง → จำกัด 5 ลิงก์/ชม./คน
export const POST = guarded(async (req: NextRequest) => {
  const auth = resolveUser(req);
  if (!rateLimit(`imports:${auth.id}`, 5, 60 * 60_000)) {
    return attachAuth(new NextResponse("Max 5 links per hour", { status: 429 }), auth);
  }

  const { url } = (await req.json()) as { url?: string };
  if (!url || typeof url !== "string" || url.length > 500) {
    return attachAuth(new NextResponse("url required", { status: 400 }), auth);
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return attachAuth(new NextResponse("Invalid URL", { status: 400 }), auth);
  }
  const platform = host.includes("tiktok")
    ? "tiktok"
    : host.includes("instagram")
      ? "ig"
      : host.includes("youtu")
        ? "youtube"
        : null;
  if (!platform) {
    return attachAuth(new NextResponse("Only TikTok / Instagram / YouTube links are supported", { status: 400 }), auth);
  }

  await store.ensureUser(auth.id);
  await store.addImport(auth.id, url, platform);
  await store.addEvent(auth.id, "import_link", { url, platform });
  return attachAuth(NextResponse.json({ ok: true }), auth);
});
