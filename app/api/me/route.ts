import { NextRequest, NextResponse } from "next/server";
import { attachAuth, clearAuthCookies, displayNameFrom, resolveUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { expandPlan } from "@/lib/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  const auth = resolveUser(req);
  const [user, savedIds, plans, imports, catalog] = await Promise.all([
    store.ensureUser(auth.id),
    store.savedVenueIdsOf(auth.id),
    store.plansOf(auth.id),
    store.importsOf(auth.id),
    getCatalog(),
  ]);

  const saves = savedIds
    .map((id) => catalog.venues.find((v) => v.id === id))
    .filter((v) => v !== undefined);
  const expanded = await Promise.all(plans.map(expandPlan));

  return attachAuth(
    NextResponse.json({
      saves,
      plans: expanded,
      imports,
      taste: user.taste,
      auth: { provider: auth.provider, displayName: displayNameFrom(req) },
    }),
    auth,
  );
}

// PDPA — ลบข้อมูลผู้ใช้ทุกตารางจริง (A12) แล้วล้าง cookie → รอบหน้าได้ตัวตนใหม่
export async function DELETE(req: NextRequest) {
  const auth = resolveUser(req);
  if (!auth.isNew) await store.wipeUser(auth.id);
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
