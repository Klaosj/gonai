import { Suspense } from "react";
import { SkeletonPage } from "@/components/LoadingSkeleton";
import PlannerClient from "./planner-client";

export default function Page() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <PlannerClient />
    </Suspense>
  );
}