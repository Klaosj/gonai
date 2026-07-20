import { NextRequest, NextResponse } from "next/server";
import { expandPlan, venueById } from "@/lib/server";
import { ensureUser, getStore, wipeUser } from "@/lib/store";

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  const user = ensureUser(uid);
  const store = getStore();

  const saves = store.saves
    .filter((s) => s.user_id === uid)
    .map((s) => venueById(s.venue_id))
    .filter((v) => v !== undefined);

  const plans = Object.values(store.plans)
    .filter((p) => p.user_id === uid)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(expandPlan);

  return NextResponse.json({ saves, plans, taste: user.taste });
}

// PDPA — ลบข้อมูลผู้ใช้ทุกตารางจริง (A12)
export async function DELETE(req: NextRequest) {
  const uid = req.headers.get("x-gn-user") ?? "anon";
  wipeUser(uid);
  return NextResponse.json({ ok: true });
}
