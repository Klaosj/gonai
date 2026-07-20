import { NextRequest, NextResponse } from "next/server";
import { mid } from "@/lib/costing";
import { expandPlan, venueById } from "@/lib/server";
import { getStore, persist } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const plan = getStore().plans[id];
  if (!plan) return new NextResponse("plan not found", { status: 404 });
  return NextResponse.json(expandPlan(plan));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const plan = getStore().plans[id];
  if (!plan) return new NextResponse("plan not found", { status: 404 });

  const body = (await req.json()) as {
    action: string;
    value?: number;
    venue_id?: string;
    seq?: number;
    amount?: number;
  };

  switch (body.action) {
    case "route_toggle":
      plan.route_kind = plan.route_kind === "cheapest" ? "fastest" : "cheapest";
      break;
    case "budget_edit":
      if (body.value && body.value > 0) plan.budget_planned = body.value;
      break;
    case "add_stop": {
      const v = body.venue_id ? venueById(body.venue_id) : undefined;
      if (!v) return new NextResponse("venue not found", { status: 404 });
      plan.stops.push({
        seq: plan.stops.length + 1,
        venue_id: v.id,
        est_cost: mid(v.price_per_head_min, v.price_per_head_max),
        actual_cost: null,
        checked_in_at: null,
      });
      break;
    }
    case "start":
      plan.status = "active";
      break;
    case "checkin": {
      const s = plan.stops.find((x) => x.seq === body.seq);
      if (s) s.checked_in_at = new Date().toISOString();
      break;
    }
    case "spend": {
      const s = plan.stops.find((x) => x.seq === body.seq);
      if (s && typeof body.amount === "number" && body.amount >= 0) s.actual_cost = body.amount;
      break;
    }
    case "done": {
      plan.status = "done";
      plan.budget_actual = expandPlan(plan).spent;
      break;
    }
    default:
      return new NextResponse("unknown action", { status: 400 });
  }

  persist();
  return NextResponse.json(expandPlan(plan));
}
