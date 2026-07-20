import { NextRequest, NextResponse } from "next/server";
import { attachAuth, resolveUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { applyVenueFilters, parseFilters } from "@/lib/filters";
import { routesForOrigin } from "@/lib/server";
import { store } from "@/lib/store";
import { top3 } from "@/lib/top3";
import { getRainForecast } from "@/lib/weather";
import type { Intent } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = resolveUser(req);
  await store.ensureUser(auth.id);

  const sp = req.nextUrl.searchParams;
  const intent = (sp.get("intent") ?? "work") as Intent;
  const origin = sp.get("origin") ?? "bangkapi";
  const filters = parseFilters(sp);

  const [{ venues, zones }, weather] = await Promise.all([getCatalog(), getRainForecast()]);
  const pool = applyVenueFilters(venues, filters);
  const result = top3(pool, intent);
  if (result.unseenPoolEmpty) await store.addEvent(auth.id, "unseen_pool_empty", { intent });

  const savedIds = await store.savedVenueIdsOf(auth.id);
  return attachAuth(
    NextResponse.json({
      ...result,
      savedIds,
      routes: await routesForOrigin(origin),
      weather, // null = ดึงพยากรณ์ไม่ได้ — UI ห้ามโชว์คำเตือน
      zones: zones.filter((z) => z.is_origin),
    }),
    auth,
  );
}
