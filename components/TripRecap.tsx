"use client";
// สรุปทริปแบบแชร์ได้ — ปิดวง Sharing → คนเห็น → มา Dreaming ต่อ
// วาด PNG ด้วย canvas แล้ว Web Share API (มือถือ) หรือดาวน์โหลด (desktop)
import { track } from "@/lib/api";
import type { ExpandedPlan } from "@/lib/server";

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: "☕",
  restaurant: "🍜",
  activity: "🎨",
  market: "🛍️",
};

function drawRecap(plan: ExpandedPlan): HTMLCanvasElement {
  const W = 720;
  const H = 960;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const font = (size: number, weight = 600) => `${weight} ${size}px 'Noto Sans Thai', system-ui, sans-serif`;

  // พื้นหลัง cream + แถบหัว
  g.fillStyle = "#faf6f0";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1e7f4f";
  g.fillRect(0, 0, W, 140);
  g.fillStyle = "#ffffff";
  g.font = font(40, 800);
  g.fillText("สรุปทริปวันนี้ 🎉", 48, 78);
  g.font = font(24, 500);
  g.globalAlpha = 0.85;
  g.fillText(
    new Date(plan.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) +
      ` · ${plan.origin_name} → สยาม`,
    48,
    116,
  );
  g.globalAlpha = 1;

  // รายการ stops (สูงสุด 6 บรรทัด)
  let y = 210;
  g.fillStyle = "#1a2238";
  for (const s of plan.stops.slice(0, 6)) {
    g.font = font(28, 600);
    const cost = s.actual_cost ?? s.est_cost;
    const emoji = CATEGORY_EMOJI[s.venue.category] ?? "📍";
    const name = s.venue.name_th.length > 22 ? s.venue.name_th.slice(0, 21) + "…" : s.venue.name_th;
    g.fillText(`${emoji}  ${name}`, 48, y);
    g.font = font(28, 800);
    const costText = `${cost}฿`;
    g.fillText(costText, W - 48 - g.measureText(costText).width, y);
    y += 58;
  }
  if (plan.stops.length > 6) {
    g.font = font(24, 500);
    g.fillStyle = "#8a8578";
    g.fillText(`+ อีก ${plan.stops.length - 6} ที่`, 48, y);
    y += 50;
  }

  // เส้นคั่น
  g.strokeStyle = "#e5ded2";
  g.beginPath();
  g.moveTo(48, y);
  g.lineTo(W - 48, y);
  g.stroke();
  y += 80;

  // ตัวเลขใหญ่: จ่ายจริง
  const actual = plan.budget_actual ?? plan.spent;
  const over = actual > plan.budget_planned;
  g.fillStyle = "#1a2238";
  g.font = font(30, 600);
  g.fillText("จ่ายจริงทั้งวัน", 48, y);
  g.fillStyle = over ? "#c6362c" : "#1e7f4f";
  g.font = font(84, 800);
  g.fillText(`${actual}฿`, 48, y + 96);
  g.fillStyle = "#8a8578";
  g.font = font(28, 500);
  g.fillText(
    over ? `งบตั้งไว้ ${plan.budget_planned}฿ · เกิน ${actual - plan.budget_planned}฿` : `งบตั้งไว้ ${plan.budget_planned}฿ · ${over ? "" : "ไม่เกินงบ ✓"}`,
    48,
    y + 148,
  );

  // footer แบรนด์
  g.fillStyle = "#f25c05";
  g.fillRect(0, H - 110, W, 110);
  g.fillStyle = "#ffffff";
  g.font = font(30, 800);
  g.fillText("ไปไหน PaiNai", 48, H - 62);
  g.font = font(22, 500);
  g.globalAlpha = 0.9;
  g.fillText("วางแผนเที่ยว 1 วัน · รู้งบทุกบาทก่อนออกจากบ้าน", 48, H - 28);
  g.globalAlpha = 1;

  return c;
}

export default function TripRecap({ plan, onShared }: { plan: ExpandedPlan; onShared: (m: string) => void }) {
  const share = () => {
    track("share_recap", { plan_id: plan.id });
    const canvas = drawRecap(plan);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "painai-trip.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "สรุปทริปวันนี้ — ไปไหน PaiNai" });
          onShared("แชร์สรุปทริปแล้ว 🎉");
          return;
        } catch {
          // ผู้ใช้กดยกเลิก share sheet — เงียบไว้
          return;
        }
      }
      // desktop: ดาวน์โหลดรูปแทน
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "painai-trip.png";
      a.click();
      URL.revokeObjectURL(a.href);
      onShared("บันทึกรูปสรุปทริปแล้ว — เอาไปโพสต์ได้เลย 📸");
    }, "image/png");
  };

  return (
    <button
      onClick={share}
      className="w-full rounded-xl bg-gn-purple py-3 font-extrabold text-white shadow-md hover:opacity-90"
    >
      📸 แชร์สรุปทริป (รูปสวยพร้อมโพสต์)
    </button>
  );
}
