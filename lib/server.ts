// Server helpers: route lookup + plan expansion
import { LAUNCH_ZONE, ROUTES, VENUES, ZONES } from "./fixtures";
import { dayBudgetEst, grabEstimate, mid, routeCost } from "./costing";
import type { Plan, Route, Venue } from "./types";

export function venueById(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

export function zoneName(id: string): string {
  return ZONES.find((z) => z.id === id)?.name_th ?? id;
}

// เส้นทางจาก origin → สยาม: ใช้ seeded routes ถ้ามี ไม่งั้น fallback สูตร Grab (spec 2.4)
export function routesForOrigin(origin: string): { cheapest: Route; fastest: Route; fallback: boolean } {
  const cheapest = ROUTES.find((r) => r.origin_zone === origin && r.kind === "cheapest");
  const fastest = ROUTES.find((r) => r.origin_zone === origin && r.kind === "fastest");
  if (cheapest && fastest) return { cheapest, fastest, fallback: false };

  const km = ZONES.find((z) => z.id === origin)?.km_to_siam ?? 12;
  const est = grabEstimate(km);
  const minutes = Math.round(15 + km * 1.5);
  const synthetic = (kind: "cheapest" | "fastest"): Route => ({
    id: `SYN-${origin}-${kind}`,
    origin_zone: origin,
    dest_zone: LAUNCH_ZONE,
    kind,
    legs: [
      {
        route_id: `SYN-${origin}-${kind}`,
        seq: 1,
        mode: "grab",
        detail_th: "Grab (ประมาณจากสูตร — ยังไม่ validate)",
        price_min: est.min,
        price_max: est.max,
        minutes,
        warning_th: null,
      },
    ],
  });
  return { cheapest: cheapest ?? synthetic("cheapest"), fastest: fastest ?? synthetic("fastest"), fallback: true };
}

export interface ExpandedStop {
  seq: number;
  venue: Venue;
  est_cost: number;
  actual_cost: number | null;
  checked_in_at: string | null;
}

export interface ExpandedPlan {
  id: string;
  intent: Plan["intent"];
  origin_zone: string;
  origin_name: string;
  status: Plan["status"];
  route_kind: Plan["route_kind"];
  budget_planned: number;
  budget_actual: number | null;
  est_total: number;
  spent: number;
  remaining: number;
  route: Route;
  route_alt: Route;
  route_fallback: boolean;
  warnings: string[];
  stops: ExpandedStop[];
  created_at: string;
}

export function expandPlan(plan: Plan): ExpandedPlan {
  const { cheapest, fastest, fallback } = routesForOrigin(plan.origin_zone);
  const route = plan.route_kind === "cheapest" ? cheapest : fastest;
  const routeAlt = plan.route_kind === "cheapest" ? fastest : cheapest;
  const rc = routeCost(route.legs);
  const routeMid = mid(rc.min, rc.max);

  const stops: ExpandedStop[] = plan.stops
    .map((s) => {
      const venue = venueById(s.venue_id);
      if (!venue) return null;
      return { seq: s.seq, venue, est_cost: s.est_cost, actual_cost: s.actual_cost, checked_in_at: s.checked_in_at };
    })
    .filter((s): s is ExpandedStop => s !== null);

  const est_total = dayBudgetEst(stops.map((s) => s.est_cost), [routeMid]);
  const actualSum = stops.reduce((sum, s) => sum + (s.actual_cost ?? 0), 0);
  // เมื่อเริ่มเที่ยวแล้ว นับค่าเดินทาง (ราคากลาง) เป็นรายจ่ายทันที
  const spent = plan.status === "draft" ? 0 : routeMid + actualSum;
  const remaining = Math.max(0, plan.budget_planned - spent);

  return {
    id: plan.id,
    intent: plan.intent,
    origin_zone: plan.origin_zone,
    origin_name: zoneName(plan.origin_zone),
    status: plan.status,
    route_kind: plan.route_kind,
    budget_planned: plan.budget_planned,
    budget_actual: plan.budget_actual,
    est_total,
    spent,
    remaining,
    route,
    route_alt: routeAlt,
    route_fallback: fallback,
    warnings: route.legs.map((l) => l.warning_th).filter((w): w is string => !!w),
    stops,
    created_at: plan.created_at,
  };
}

export function nowBangkokHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
