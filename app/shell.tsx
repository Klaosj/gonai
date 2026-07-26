"use client";
// Shell — header (active tab + avatar + Taste DNA chip) + footer — ใช้เฉพาะโซนแอป (/app/*)
// landing (/) ไม่ใช้ Shell — แยกโลก marketing กับแอปออกจากกัน
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { gn, track } from "@/lib/api";
import type { ExpandedPlan } from "@/lib/server";
import type { Venue } from "@/lib/types";

const TABS = [
  { key: "planner", label: "🗺️ Plan", href: "/app" },
  { key: "explore", label: "🔎 Explore", href: "/app/explore" },
  { key: "group", label: "👥 Group · soon", href: "/app/group" },
  { key: "trips", label: "🎒 My trips", href: "/app/me" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/plan") || pathname.startsWith("/app/trip");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

interface MeResponse {
  plans: ExpandedPlan[];
  taste: Record<string, number>;
}

const INTENT_DNA_LABELS: Record<string, string> = {
  work: "Worker",
  date: "Dater",
  family: "Family-first",
  photo: "Shutterbug",
};

const CATEGORY_DNA_LABELS: Record<Venue["category"], string> = {
  cafe: "Cafe lover",
  restaurant: "Foodie",
  activity: "Activity fan",
  market: "Market hopper",
};

// สูงสุดของ key แบบ "prefix:value" — คืน value ที่นับสูงสุด (ไม่มี = null)
function topByPrefix(taste: Record<string, number>, prefix: string): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(taste)) {
    if (!k.startsWith(prefix)) continue;
    if (n > bestN) {
      bestN = n;
      best = k.slice(prefix.length);
    }
  }
  return best;
}

// Taste DNA chip — ทุกชิ้นมาจากข้อมูลจริง (plan §2) ไม่มี placeholder
function tasteDnaLabels(me: MeResponse): string[] {
  const labels: string[] = [];

  const topIntent = topByPrefix(me.taste, "intent:");
  if (topIntent && INTENT_DNA_LABELS[topIntent]) labels.push(INTENT_DNA_LABELS[topIntent]);

  const topSave = topByPrefix(me.taste, "save:");
  if (topSave && CATEGORY_DNA_LABELS[topSave as Venue["category"]]) {
    labels.push(CATEGORY_DNA_LABELS[topSave as Venue["category"]]);
  }

  const done = me.plans.filter((p) => p.status === "done" && p.budget_actual !== null);
  if (done.length >= 2) {
    const overCount = done.filter((p) => (p.budget_actual ?? 0) > p.budget_planned).length;
    if (overCount === 0) labels.push("Budget saver");
    else if (overCount > done.length - overCount) labels.push("Big spender");
  }

  return labels.slice(0, 3);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [me, setMe] = useState<MeResponse | null>(null);

  // Taste DNA — โหลดครั้งเดียวตอน mount ทุกหน้าในโซนแอป · เงียบเมื่อพัง (ไม่บล็อค UI)
  useEffect(() => {
    gn<MeResponse>("/api/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  // client error reporter — ส่งเข้า events ให้เห็นปัญหาจริงจากเครื่องผู้ใช้ (สูงสุด 1 ครั้ง/30 วิ)
  useEffect(() => {
    let last = 0;
    const report = (message: string) => {
      const now = Date.now();
      if (now - last < 30_000) return;
      last = now;
      track("client_error", { message: message.slice(0, 300), path: window.location.pathname });
    };
    const onError = (e: ErrorEvent) => report(e.message);
    const onReject = (e: PromiseRejectionEvent) => report(String(e.reason).slice(0, 300));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  const donePlans = me?.plans.filter((p) => p.status === "done") ?? [];
  const activePlan = me?.plans.find((p) => p.status === "active") ?? null;
  // มี done plan อย่างน้อย 1 + ไม่ใช่หน้า onboarding เท่านั้นถึงโชว์ — ไม่มีข้อมูล = ไม่โชว์อะไรเลย
  const showDna = donePlans.length > 0 && pathname !== "/app/welcome" && me !== null;
  const dnaDots = Math.min(5, donePlans.length);
  const dnaLabels = me ? tasteDnaLabels(me) : [];

  return (
    <>
      {/* pt สูงกว่า pb เล็กน้อย — เผื่อหัวเครื่องบินของโลโก้ยื่นเหนือ cap height ไม่ให้โดนขอบจอตัด */}
      <header className="gn-glass sticky top-0 z-50 flex items-center gap-4 px-5 pb-2 pt-3.5">
        <Link href="/app" className="flex items-baseline gap-2">
          <Logo className="text-[19px]" />
          <span className="hidden text-[11px] text-mut sm:inline">plan · go · never over budget</span>
        </Link>
        <nav className="ml-2 hidden gap-1 sm:flex">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`gn-press o-mono rounded-full px-4 py-2 text-[11px] ${
                  on ? "bg-pill text-bg" : "text-mut hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* มีทริปกำลังเที่ยว = ทางกลับเข้า live mode ติดตัวทุกหน้า */}
          {activePlan && (
            <Link
              href={`/app/plan/${activePlan.id}`}
              className="gn-press flex items-center gap-1.5 rounded-full border border-accent/40 bg-tint px-3 py-1.5 text-[11px] font-bold text-accent"
            >
              <span className="gn-live-dot" aria-hidden />
              LIVE
              {/* ข้อความยาวเฉพาะ lg+ — ที่ 640–789px แถวหัวรวมกันแล้วยาว 790px ดันจอล้น (iPad แนวตั้ง 768 โดนเต็มๆ) */}
              <span className="hidden lg:inline">· back to trip</span>
            </Link>
          )}
          {showDna && (
            <Link
              href="/app/me"
              title={`Built from ${donePlans.length} completed trips`}
              /* lg+ เท่านั้น — ชิปนี้เป็นของประดับ ยอมหายก่อนเพื่อไม่ให้แถวหัวดันจอล้นในช่วง 640–789px */
              className="gn-press hidden items-center gap-2.5 rounded-full border border-line bg-card px-3.5 py-1.5 lg:flex"
            >
              <span className="o-mono text-[10px] text-accent">Taste DNA</span>
              <span className="flex gap-[3px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < dnaDots ? "bg-accent" : "bg-accent/25"}`}
                  />
                ))}
              </span>
              {dnaLabels.length > 0 && <span className="text-[12px] text-mut">{dnaLabels.join(" · ")}</span>}
            </Link>
          )}
        </div>

        <Link
          href="/app/me"
          className="gn-press flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-card text-ink"
          aria-label="My trips"
        >
          👤
        </Link>
      </header>

      {children}

      <footer className="o-mono-text flex flex-wrap justify-center gap-5 border-t border-line bg-bg px-5 py-3.5 text-[11px] text-mut">
        <span>🚧 Beta — sample data; collecting real Siam data now</span>
        <span>✨ Unseen spots need ≥ 3 real confirmations to show</span>
        <span>🗺 Win/boat/BTS routes field-collected · Grab formula until validated</span>
        <span>🔒 PDPA compliant — view/delete your data anytime</span>
      </footer>
    </>
  );
}
