import { NextRequest, NextResponse } from "next/server";
import { attachAuth, resolveUser, type AuthUser } from "@/lib/auth";
import { mid } from "@/lib/costing";
import { findBlockingActive } from "@/lib/plan-rules";
import { expandPlan, venueById } from "@/lib/server";
import { store } from "@/lib/store";
import type { Plan } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// แผนเป็นของเจ้าของเท่านั้น — คนอื่นรู้ id ก็อ่าน/แก้ไม่ได้ (ตอบ 404 ไม่ใช่ 403 กัน id probing)
async function ownedPlan(id: string, auth: AuthUser): Promise<Plan | null> {
  const plan = await store.getPlan(id);
  if (!plan || plan.user_id !== auth.id) return null;
  return plan;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = resolveUser(req);
  const { id } = await ctx.params;
  const plan = await ownedPlan(id, auth);
  if (!plan) return attachAuth(new NextResponse("plan not found", { status: 404 }), auth);
  return attachAuth(NextResponse.json(await expandPlan(plan)), auth);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = resolveUser(req);
  const { id } = await ctx.params;
  const plan = await ownedPlan(id, auth);
  if (!plan) return attachAuth(new NextResponse("plan not found", { status: 404 }), auth);

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
      const v = body.venue_id ? await venueById(body.venue_id) : undefined;
      if (!v) return attachAuth(new NextResponse("venue not found", { status: 404 }), auth);
      plan.stops.push({
        seq: plan.stops.length + 1,
        venue_id: v.id,
        est_cost: mid(v.price_per_head_min, v.price_per_head_max),
        actual_cost: null,
        checked_in_at: null,
      });
      break;
    }
    case "start": {
      // กัน active trip ซ้อน — โหลด plans ของ user วิธีเดียวกับ /api/me (store.plansOf) แล้วเช็คว่ามี active ตัวอื่นค้างอยู่ไหม
      const userPlans = await store.plansOf(auth.id);
      const blocking = findBlockingActive(userPlans, plan.id);
      if (blocking) {
        return attachAuth(
          NextResponse.json({ error: "already_active", activePlanId: blocking.id }, { status: 409 }),
          auth,
        );
      }
      plan.status = "active";
      break;
    }
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
      plan.budget_actual = (await expandPlan(plan)).spent;
      break;
    }
    default:
      return attachAuth(new NextResponse("unknown action", { status: 400 }), auth);
  }

  await store.savePlan(plan);
  return attachAuth(NextResponse.json(await expandPlan(plan)), auth);
}
