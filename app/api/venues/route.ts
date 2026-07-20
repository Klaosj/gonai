import { NextRequest, NextResponse } from "next/server";
import { attachAuth, resolveUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { routesForOrigin } from "@/lib/server";
import { store } from "@/lib/store";
import { top3 } from "@/lib/top3";
import type { Intent } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = resolveUser(req);
  await store.ensureUser(auth.id);

  const sp = req.nextUrl.searchParams;
  const intent = (sp.get("intent") ?? "work") as Intent;
  const origin = sp.get("origin") ?? "bangkapi";

  const { venues } = await getCatalog();
  const result = top3(venues, intent);
  if (result.unseenPoolEmpty) await store.addEvent(auth.id, "unseen_pool_empty", { intent });

  const savedIds = await store.savedVenueIdsOf(auth.id);
  return attachAuth(
    NextResponse.json({ ...result, savedIds, routes: await routesForOrigin(origin) }),
    auth,
  );
}
