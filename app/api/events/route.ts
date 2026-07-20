import { NextRequest, NextResponse } from "next/server";
import { addEvent, ensureUser } from "@/lib/store";

export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  ensureUser(uid);
  const body = (await req.json()) as { type: string; payload?: Record<string, unknown> };
  if (!body.type) return new NextResponse("type required", { status: 400 });
  addEvent(uid, body.type, body.payload ?? {});
  return NextResponse.json({ ok: true });
}
