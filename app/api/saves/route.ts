import { NextRequest, NextResponse } from "next/server";
import { venueById } from "@/lib/server";
import { bumpTaste, ensureUser, getStore, persist } from "@/lib/store";

export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  ensureUser(uid);
  const { venue_id } = (await req.json()) as { venue_id: string };
  const venue = venueById(venue_id);
  if (!venue) return new NextResponse("venue not found", { status: 404 });

  const store = getStore();
  const existing = store.saves.findIndex((s) => s.user_id === uid && s.venue_id === venue_id);
  let saved: boolean;
  if (existing >= 0) {
    store.saves.splice(existing, 1);
    saved = false;
  } else {
    store.saves.push({ user_id: uid, venue_id, created_at: new Date().toISOString() });
    bumpTaste(uid, `save:${venue.category}`);
    saved = true;
  }
  persist();
  return NextResponse.json({ saved });
}
