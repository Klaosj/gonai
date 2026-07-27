import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { attachAuth, resolveUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

export const POST = guarded(async (req: NextRequest) => {
  const auth = resolveUser(req);
  if (!rateLimit(`events:${auth.id}`, 60, 60_000)) {
    return attachAuth(new NextResponse("too many events", { status: 429 }), auth);
  }

  const body = (await req.json()) as { type?: string; payload?: Record<string, unknown> };
  if (!body.type || typeof body.type !== "string" || body.type.length > 64) {
    return attachAuth(new NextResponse("type required", { status: 400 }), auth);
  }
  const payload = body.payload ?? {};
  if (JSON.stringify(payload).length > 2048) {
    return attachAuth(new NextResponse("payload too large", { status: 400 }), auth);
  }

  await store.ensureUser(auth.id);
  await store.addEvent(auth.id, body.type, payload);
  return attachAuth(NextResponse.json({ ok: true }), auth);
});
