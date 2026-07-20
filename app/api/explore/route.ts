import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

// ข้อมูลจริงสำหรับแท็บสำรวจ: Hit อันดับต้น + Unseen ที่ผ่านการยืนยันแล้ว
export async function GET() {
  const { venues } = await getCatalog();
  const hits = venues
    .filter((v) => v.badge === "hit" && v.hit_rank !== null)
    .sort((a, b) => (a.hit_rank ?? 99) - (b.hit_rank ?? 99))
    .slice(0, 2);
  const unseen = venues
    .filter((v) => v.badge === "unseen" && v.validation_count >= 3 && v.unseen_rank !== null)
    .sort((a, b) => (a.unseen_rank ?? 99) - (b.unseen_rank ?? 99))
    .slice(0, 2);
  return NextResponse.json({ hot: [...hits, ...unseen] });
}
