// LoadingSkeleton — shimmer placeholder ใช้แทน "กำลังโหลด…"
// T3.2: ทุก variant ประกาศสถานะโหลดให้ screen reader (role=status + sr-only text) — sr-only ไม่กระทบหน้าตา
export default function LoadingSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`gn-skeleton space-y-2 ${className}`} role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-full bg-gn-cream"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gn-line bg-gn-card" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="gn-skeleton h-32 bg-gn-cream" />
      <div className="space-y-2 p-4">
        <div className="gn-skeleton h-4 w-2/3 rounded-full bg-gn-cream" />
        <div className="gn-skeleton h-3 w-1/2 rounded-full bg-gn-cream" />
        <div className="gn-skeleton h-3 w-5/6 rounded-full bg-gn-cream" />
        <div className="gn-skeleton h-8 rounded-full bg-gn-cream" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="gn-skeleton h-7 w-1/3 rounded-full bg-gn-cream" />
      <div className="gn-skeleton h-3 w-1/2 rounded-full bg-gn-cream" />
      {/* T3.2b: SkeletonCard แต่ละใบมี role=status/sr-only ของตัวเอง (ต้องใช้เดี่ยวๆ ได้ที่อื่น)
          แต่ตอนซ้อนกัน 3 ใบในนี้ ตัวนอกสุด (div นี้) ประกาศ "Loading…" ให้ครบแล้ว — ครอบ grid นี้ด้วย
          aria-hidden กัน screen reader ประกาศซ้ำ 4 รอบ (1 ตัวนอก + 3 การ์ดข้างใน) ตอน /app โหลด */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
