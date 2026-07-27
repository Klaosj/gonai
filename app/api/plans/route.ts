import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { attachAuth, resolveUser } from "@/lib/auth";
import { budgetDefault } from "@/lib/budget";
import { mid } from "@/lib/costing";
import { expandPlan, venueById } from "@/lib/server";
import { store } from "@/lib/store";
import { INTENT_LABELS, type Intent, type Plan } from "@/lib/types";

const VALID_INTENTS = new Set(Object.keys(INTENT_LABELS)) as Set<Intent>;

export const POST = guarded(async (req: NextRequest) => {
  const auth = resolveUser(req);
  await store.ensureUser(auth.id);

  const body = (await req.json()) as {
    intent?: Intent;
    origin?: string;
    venue_id?: string;
    budget?: number | null;
  };
  // input validation (R10f + R10g)
  if (!body.intent || !VALID_INTENTS.has(body.intent)) {
    return attachAuth(new NextResponse("invalid intent", { status: 400 }), auth);
  }
  if (!body.origin || typeof body.origin !== "string" || body.origin.length > 32) {
    return attachAuth(new NextResponse("invalid origin", { status: 400 }), auth);
  }
  if (!body.venue_id || typeof body.venue_id !== "string") {
    return attachAuth(new NextResponse("venue_id required", { status: 400 }), auth);
  }
  if (body.budget !== null && body.budget !== undefined && body.budget <= 0) {
    return attachAuth(new NextResponse("budget must be > 0", { status: 400 }), auth);
  }
  const venue = await venueById(body.venue_id);
  if (!venue) return attachAuth(new NextResponse("venue not found", { status: 404 }), auth);

  const plan: Plan = {
    id: crypto.randomUUID(),
    user_id: auth.id,
    intent: body.intent,
    origin_zone: body.origin,
    status: "draft",
    route_kind: "cheapest",
    budget_planned: body.budget ?? budgetDefault(body.intent, await store.donePlansOf(auth.id)),
    budget_actual: null,
    stops: [
      {
        seq: 1,
        venue_id: venue.id,
        est_cost: mid(venue.price_per_head_min, venue.price_per_head_max),
        actual_cost: null,
        checked_in_at: null,
      },
    ],
    created_at: new Date().toISOString(),
  };

  await store.savePlan(plan);
  await store.bumpTaste(auth.id, `intent:${body.intent}`);

  return attachAuth(NextResponse.json(await expandPlan(plan)), auth);
});
