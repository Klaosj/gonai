import { NextRequest, NextResponse } from "next/server";
import { VENUES } from "@/lib/fixtures";
import { routesForOrigin } from "@/lib/server";
import { addEvent, ensureUser, getStore } from "@/lib/store";
import { top3 } from "@/lib/top3";
import type { Intent } from "@/lib/types";

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  ensureUser(uid);

  const sp = req.nextUrl.searchParams;
  const intent = (sp.get("intent") ?? "work") as Intent;
  const origin = sp.get("origin") ?? "bangkapi";

  const result = top3(VENUES, intent);
  if (result.unseenPoolEmpty) addEvent(uid, "unseen_pool_empty", { intent });

  const savedIds = getStore()
    .saves.filter((s) => s.user_id === uid)
    .map((s) => s.venue_id);

  return NextResponse.json({ ...result, savedIds, routes: routesForOrigin(origin) });
}
