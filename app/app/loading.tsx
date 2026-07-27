// loading.tsx — Next.js route loading boundary สำหรับ /app/* ทั้งหมด ใช้ skeleton เดียวกับใน page.tsx
import { SkeletonPage } from "@/components/LoadingSkeleton";

export default function Loading() {
  return <SkeletonPage />;
}
