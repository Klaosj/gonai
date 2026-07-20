import { Suspense } from "react";
import PlannerClient from "./planner-client";

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-gn-mut">กำลังโหลด…</p>}>
      <PlannerClient />
    </Suspense>
  );
}