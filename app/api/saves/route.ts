import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { attachAuth, resolveUser } from "@/lib/auth";
import { venueById } from "@/lib/server";
import { store } from "@/lib/store";

export const POST = guarded(async (req: NextRequest) => {
  const auth = resolveUser(req);
  await store.ensureUser(auth.id);
  const { venue_id } = (await req.json()) as { venue_id: string };
  const venue = await venueById(venue_id);
  if (!venue) return attachAuth(new NextResponse("venue not found", { status: 404 }), auth);

  const saved = await store.toggleSave(auth.id, venue_id);
  if (saved) await store.bumpTaste(auth.id, `save:${venue.category}`);
  return attachAuth(NextResponse.json({ saved }), auth);
});
