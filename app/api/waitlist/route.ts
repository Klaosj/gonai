import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

// Waitlist จาก landing page — เก็บ contact + PDPA consent
export const POST = guarded(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`waitlist:${ip}`, 5, 60 * 60_000)) {
    return new NextResponse("Try again in an hour", { status: 429 });
  }

  const body = (await req.json()) as { contact?: string; source?: string; pdpa_consent?: boolean };
  const contact = body.contact?.trim();
  if (!contact || contact.length < 3 || contact.length > 200) {
    return new NextResponse("Enter a LINE ID or email", { status: 400 });
  }
  if (body.pdpa_consent !== true) {
    return new NextResponse("Consent to contact is required (PDPA)", { status: 400 });
  }

  await store.addWaitlist({
    contact,
    channel: contact.includes("@") ? "email" : "line",
    source: typeof body.source === "string" ? body.source.slice(0, 64) : null,
    pdpa_consent: true,
  });
  return NextResponse.json({ ok: true });
});
