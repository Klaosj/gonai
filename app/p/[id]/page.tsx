// หน้าแชร์แผนแบบ view-only — เปิดได้ด้วยลิงก์ที่มี token เท่านั้น (ไม่ต้อง login)
// ไม่โชว์ข้อมูลเจ้าของ · ตัวเลขทุกตัวมาจาก expandPlan เดียวกับในแอป
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import { StopTimelineList } from "@/components/StopTimelineList";
import { expandPlan } from "@/lib/server";
import { verifyShareToken } from "@/lib/share";
import { store } from "@/lib/store";
import { tripTitle } from "@/lib/timeline";

export const metadata: Metadata = {
  title: "Trip plan — GoNai",
  description: "A day plan with every baht counted — made with GoNai",
};

export default async function SharedPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { id } = await params;
  const { k } = await searchParams;
  if (!verifyShareToken(id, k)) notFound();

  const raw = await store.getPlan(id);
  if (!raw) notFound();
  const plan = await expandPlan(raw);
  const title = tripTitle(plan.intent, plan.origin_name, plan.budget_planned);

  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-ink">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Logo className="text-[24px]" />
        </div>

        <div className="gn-card-e p-5">
          <p className="o-mono text-[10px] text-mut">SHARED PLAN · VIEW ONLY</p>
          <h1 className="o-serif mt-1 text-[22px] font-medium leading-snug">{title}</h1>

          <StopTimelineList plan={plan} variant="readonly" />

          {/* มือถือวางซ้อนกัน: ที่ 390px ป้าย mono ตกเป็น 2 บรรทัดแล้วบีบคอลัมน์ขวาจนคำว่า budget
              หลุดไปคนละบรรทัดกับตัวเลขที่มันขยาย (หน้านี้คือหน้าแรกที่คนนอกเห็น ห้ามพัง) */}
          <div className="mt-3 flex flex-col gap-1 rounded-xl border border-line bg-card-solid/60 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="o-mono text-[10px] text-mut sm:shrink-0">EST. TOTAL INCL. TRANSPORT</span>
            <span className="gn-num whitespace-nowrap text-[22px] font-semibold">
              ~{plan.est_total}฿ <span className="text-[12px] font-normal text-mut">/ {plan.budget_planned}฿ budget</span>
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          {/* Task 2.6: เข้าแอปตรง ไม่ผ่านหน้าแรกอีกชั้น */}
          <Link href="/app" className="gn-press gn-cta o-pill-primary o-btn-label inline-block px-7 py-3 text-sm">
            Plan yours free — every baht counted ▶
          </Link>
          <p className="o-mono-text mt-3 text-[10.5px] text-mut">
            Times with ~ are estimates · transport & walk minutes are field-collected
          </p>
        </div>
      </div>
    </div>
  );
}
