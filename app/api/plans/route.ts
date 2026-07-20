import { NextRequest, NextResponse } from "next/server";
import { budgetDefault } from "@/lib/budget";
import { mid } from "@/lib/costing";
import { venueById } from "@/lib/server";
import { bumpTaste, donePlansOf, ensureUser, getStore, persist } from "@/lib/store";
import { INTENT_LABELS, type Intent, type Plan } from "@/lib/types";

const VALID_INTENTS = new Set(Object.keys(INTENT_LABELS)) as Set<Intent>;

export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  ensureUser(uid);

  const body = (await req.json()) as {
    intent?: Intent;
    origin?: string;
    venue_id?: string;
    budget?: number | null;
  };
  // input validation (R10f + R10g)
  if (!body.intent || !VALID_INTENTS.has(body.intent)) {
    return new NextResponse("invalid intent", { status: 400 });
  }
  if (!body.origin || typeof body.origin !== "string") {
    return new NextResponse("invalid origin", { status: 400 });
  }
  if (!body.venue_id || typeof body.venue_id !== "string") {
    return new NextResponse("venue_id required", { status: 400 });
  }
  if (body.budget !== null && body.budget !== undefined && body.budget <= 0) {
    return new NextResponse("budget must be > 0", { status: 400 });
  }
  const venue = venueById(body.venue_id);
  if (!venue) return new NextResponse("venue not found", { status: 404 });

  const plan: Plan = {
    id: crypto.randomUUID(),
    user_id: uid,
    intent: body.intent,
    origin_zone: body.origin,
    status: "draft",
    route_kind: "cheapest",
    budget_planned: body.budget ?? budgetDefault(body.intent, donePlansOf(uid)),
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

  getStore().plans[plan.id] = plan;
  persist();
  bumpTaste(uid, `intent:${body.intent}`);

  return NextResponse.json({ id: plan.id });
}
