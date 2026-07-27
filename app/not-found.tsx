// not-found.tsx — 404 ในแบรนด์ ครอบทั้ง route ที่ไม่ match และ notFound() ที่เรียกจาก page ไหนก็ตาม
// (ไม่มี not-found.tsx ที่ specific กว่านี้ในทรีทั้งหมด → ไฟล์นี้คือ boundary เดียวที่ใช้ทุกที่)
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="o-serif text-[40px] font-medium text-ink">404</p>
      <p className="text-sm text-mut">This page isn&apos;t on the itinerary.</p>
      <Link href="/app" className="gn-press o-pill-primary o-btn-label px-5 py-2.5 text-sm">
        Back to planner
      </Link>
    </main>
  );
}
