import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

// Waitlist จาก landing page — เก็บ contact + PDPA consent
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`waitlist:${ip}`, 5, 60 * 60_000)) {
    return new NextResponse("ลองใหม่อีกครั้งในหนึ่งชั่วโมง", { status: 429 });
  }

  const body = (await req.json()) as { contact?: string; source?: string; pdpa_consent?: boolean };
  const contact = body.contact?.trim();
  if (!contact || contact.length < 3 || contact.length > 200) {
    return new NextResponse("กรอก LINE ID หรืออีเมล", { status: 400 });
  }
  if (body.pdpa_consent !== true) {
    return new NextResponse("ต้องยินยอมให้ติดต่อกลับ (PDPA)", { status: 400 });
  }

  await store.addWaitlist({
    contact,
    channel: contact.includes("@") ? "email" : "line",
    source: typeof body.source === "string" ? body.source.slice(0, 64) : null,
    pdpa_consent: true,
  });
  return NextResponse.json({ ok: true });
}
