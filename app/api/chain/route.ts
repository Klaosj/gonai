import { NextRequest, NextResponse } from "next/server";
import { attachAuth, resolveUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { chainSuggestions } from "@/lib/chaining";
import { LAUNCH_ZONE } from "@/lib/fixtures";
import { expandPlan, nowBangkokHHMM } from "@/lib/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  const auth = resolveUser(req);
  const sp = req.nextUrl.searchParams;
  const planId = sp.get("planId");
  const plan = planId ? await store.getPlan(planId) : null;
  if (!plan || plan.user_id !== auth.id) {
    return attachAuth(new NextResponse("plan not found", { status: 404 }), auth);
  }

  const expanded = await expandPlan(plan);
  // draft = งบที่วางแผนเหลือ · active = งบที่เหลือจริงระหว่างเที่ยว
  const remaining =
    plan.status === "draft"
      ? Math.max(0, plan.budget_planned - expanded.est_total)
      : expanded.remaining;

  const { venues } = await getCatalog();
  const list = chainSuggestions(venues, {
    zoneId: LAUNCH_ZONE,
    timeHHMM: sp.get("time") ?? nowBangkokHHMM(),
    remainingBudget: remaining,
    indoorOnly: sp.get("indoor") === "1",
    excludeIds: plan.stops.map((s) => s.venue_id),
  });

  return attachAuth(NextResponse.json(list), auth);
}
