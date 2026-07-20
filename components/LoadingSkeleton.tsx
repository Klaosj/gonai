// LoadingSkeleton — shimmer placeholder ใช้แทน "กำลังโหลด…"
export default function LoadingSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`gn-skeleton space-y-2 ${className}`}>
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
    <div className="overflow-hidden rounded-2xl border border-gn-line bg-gn-card">
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
    <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4">
      <div className="gn-skeleton h-7 w-1/3 rounded-full bg-gn-cream" />
      <div className="gn-skeleton h-3 w-1/2 rounded-full bg-gn-cream" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
