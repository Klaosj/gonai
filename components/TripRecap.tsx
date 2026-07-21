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

// ambience gradient stops ต่อ intent — ค่าเดียวกับ .o-ambience-* ใน globals.css (pastel, plan §1)
const INTENT_AMBIENCE_STOPS: Record<string, [string, string, string]> = {
  work: ["#dcefe3", "#c2dce9", "#a8c9ee"],
  date: ["#f6e7dc", "#f2dbce", "#eecfc0"],
  photo: ["#f2ecd9", "#ebe0c1", "#e4d3a8"],
  family: ["#d3ecda", "#bee4cb", "#a9dcbb"],
};

function drawRecap(plan: ExpandedPlan): HTMLCanvasElement {
  const W = 720;
  const H = 960;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const font = (size: number, weight = 600) => `${weight} ${size}px 'Instrument Sans', 'IBM Plex Sans Thai', system-ui, sans-serif`;
  const displayFont = (size: number, weight = 800) => `${weight} ${size}px 'Bricolage Grotesque', 'IBM Plex Sans Thai', system-ui, sans-serif`;
  const monoFont = (size: number, weight = 600) => `${weight} ${size}px 'IBM Plex Mono', monospace`;

  // พื้นหลังขาว + แถบหัว (การ์ดยกสี — Forest on White)
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#f2f2ee";
  g.fillRect(0, 0, W, 140);
  g.fillStyle = "#121411";
  g.font = displayFont(40, 800);
  g.fillText("Trip recap 🎉", 48, 78);
  g.font = font(24, 500);
  g.globalAlpha = 0.75;
  g.fillText(
    new Date(plan.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) +
      ` · ${plan.origin_name} → Siam`,
    48,
    116,
  );
  g.globalAlpha = 1;

  // รายการ stops (สูงสุด 6 บรรทัด)
  let y = 210;
  g.fillStyle = "#121411";
  for (const s of plan.stops.slice(0, 6)) {
    g.font = font(28, 600);
    const cost = s.actual_cost ?? s.est_cost;
    const emoji = CATEGORY_EMOJI[s.venue.category] ?? "📍";
    const name = s.venue.name_th.length > 22 ? s.venue.name_th.slice(0, 21) + "…" : s.venue.name_th;
    g.fillStyle = "#121411";
    g.fillText(`${emoji}  ${name}`, 48, y);
    g.font = monoFont(28, 700);
    const costText = `${cost}฿`;
    g.fillText(costText, W - 48 - g.measureText(costText).width, y);
    y += 58;
  }
  if (plan.stops.length > 6) {
    g.font = font(24, 500);
    g.fillStyle = "#70746e";
    g.fillText(`+ ${plan.stops.length - 6} more stops`, 48, y);
    y += 50;
  }

  // เส้นคั่น — hairline
  g.strokeStyle = "rgba(18,20,17,0.14)";
  g.beginPath();
  g.moveTo(48, y);
  g.lineTo(W - 48, y);
  g.stroke();
  y += 80;

  // ตัวเลขใหญ่: จ่ายจริง
  const actual = plan.budget_actual ?? plan.spent;
  const over = actual > plan.budget_planned;
  g.fillStyle = "#70746e";
  g.font = font(30, 600);
  g.fillText("Actually spent today", 48, y);
  g.fillStyle = over ? "#c6362c" : "#1e7f4f";
  g.font = monoFont(84, 700);
  g.fillText(`${actual}฿`, 48, y + 96);
  g.fillStyle = "#70746e";
  g.font = font(28, 500);
  g.fillText(
    over ? `Budget ${plan.budget_planned}฿ · over by ${actual - plan.budget_planned}฿` : `Budget ${plan.budget_planned}฿ · ${over ? "" : "under budget ✓"}`,
    48,
    y + 148,
  );

  // footer แบรนด์ — ambience gradient ตาม intent (pastel → ตัวอักษรเป็น ink ตาม plan §4.8)
  const stops = INTENT_AMBIENCE_STOPS[plan.intent] ?? INTENT_AMBIENCE_STOPS.work;
  const grad = g.createLinearGradient(0, H - 110, W, H);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  g.fillStyle = grad;
  g.fillRect(0, H - 110, W, 110);
  g.fillStyle = "#121411";
  g.font = displayFont(30, 800);
  g.fillText("GoNai", 48, H - 62);
  g.font = font(22, 500);
  g.globalAlpha = 0.9;
  g.fillText("Plan a full day · know every baht before you leave", 48, H - 28);
  g.globalAlpha = 1;

  return c;
}

export default function TripRecap({ plan, onShared }: { plan: ExpandedPlan; onShared: (m: string) => void }) {
  const share = () => {
    track("share_recap", { plan_id: plan.id });
    const canvas = drawRecap(plan);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "gonai-trip.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Trip recap — GoNai" });
          onShared("Recap shared 🎉");
          return;
        } catch {
          // ผู้ใช้กดยกเลิก share sheet — เงียบไว้
          return;
        }
      }
      // desktop: ดาวน์โหลดรูปแทน
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "gonai-trip.png";
      a.click();
      URL.revokeObjectURL(a.href);
      onShared("Recap image saved — ready to post 📸");
    }, "image/png");
  };

  return (
    <button onClick={share} className="gn-press o-pill-primary o-btn-label w-full py-3">
      📸 Share trip recap (ready to post)
    </button>
  );
}
