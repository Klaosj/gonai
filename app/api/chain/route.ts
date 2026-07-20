import { NextRequest, NextResponse } from "next/server";
import { chainSuggestions } from "@/lib/chaining";
import { LAUNCH_ZONE, VENUES } from "@/lib/fixtures";
import { expandPlan, nowBangkokHHMM } from "@/lib/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const planId = sp.get("planId");
  const plan = planId ? getStore().plans[planId] : undefined;
  if (!plan) return new NextResponse("plan not found", { status: 404 });

  const expanded = expandPlan(plan);
  // draft = งบที่วางแผนเหลือ · active = งบที่เหลือจริงระหว่างเที่ยว
  const remaining =
    plan.status === "draft"
      ? Math.max(0, plan.budget_planned - expanded.est_total)
      : expanded.remaining;

  const list = chainSuggestions(VENUES, {
    zoneId: LAUNCH_ZONE,
    timeHHMM: sp.get("time") ?? nowBangkokHHMM(),
    remainingBudget: remaining,
    indoorOnly: sp.get("indoor") === "1",
    excludeIds: plan.stops.map((s) => s.venue_id),
  });

  return NextResponse.json(list);
}
