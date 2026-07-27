import { NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { getCatalog } from "@/lib/catalog";

// ข้อมูลจริงสำหรับแท็บสำรวจ: venues ที่โชว์ได้ทั้งหมด (hit ทุกตัว + unseen ที่ validate ≥3 คน)
// planner-client เดิม (ก่อน 5-screens) เคยขอแค่ top 4 — ตอนนี้หน้า explore ใหม่กรอง/เรียงเอง
export const GET = guarded(async () => {
  const { venues } = await getCatalog();
  const hits = venues
    .filter((v) => v.badge === "hit" && v.hit_rank !== null)
    .sort((a, b) => (a.hit_rank ?? 99) - (b.hit_rank ?? 99));
  const unseen = venues
    .filter((v) => v.badge === "unseen" && v.validation_count >= 3 && v.unseen_rank !== null)
    .sort((a, b) => (a.unseen_rank ?? 99) - (b.unseen_rank ?? 99));
  return NextResponse.json({ hot: [...hits, ...unseen] });
});
