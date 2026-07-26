"use client";
// สรุปทริปแบบแชร์ได้ — ปิดวง Sharing → คนเห็น → มา Dreaming ต่อ
// วาด PNG ด้วย canvas แล้ว Web Share API (มือถือ) หรือดาวน์โหลด (desktop)
import { useEffect } from "react";
import { track } from "@/lib/api";
import type { ExpandedPlan } from "@/lib/server";

const INK = "#121411";
const MUT = "#70746e";
const HAIRLINE = "rgba(18,20,17,0.14)";
const ACCENT = "#107f6b";
const BRIGHT = "#41b982";
const OK = "#107f6b";
// gradient ของตัว G ตามโลโก้ (teal → เขียว → เขียวมะนาว)
const BRAND_GRAD: [number, string][] = [
  [0, "#0f9fa6"],
  [0.55, "#41b982"],
  [1, "#6ccf63"],
];
const BAD = "#c6362c";

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// อ่านชื่อ family จาก CSS var ที่ layout ผูกไว้ แทนการพิมพ์ชื่อฟอนต์ตรงๆ ใน canvas
// เหตุผล: next/font สร้าง family คู่กันเสมอ ('IBM Plex Sans Thai' + 'IBM Plex Sans Thai Fallback'
// ที่ปรับ metric ให้ไม่ขยับตอนสลับ) และชื่อที่มันสร้างเป็นรายละเอียดภายในที่เปลี่ยนได้ตามเวอร์ชัน —
// อ่านจาก var แล้วการ์ด PNG ใช้ฟอนต์ชุดเดียวกับที่หน้าจอใช้เสมอ ไม่มีทางหลุดไปฟอนต์ระบบเงียบๆ
function fontStack(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

// Chromium รองรับ ctx.letterSpacing แล้ว แต่ lib.dom เก่าบางเวอร์ชันยังไม่มี type — feature-detect ไว้กันพัง
function setTracking(g: CanvasRenderingContext2D, px: number) {
  const withTracking = g as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in withTracking) withTracking.letterSpacing = `${px}px`;
}

function drawRecap(plan: ExpandedPlan): HTMLCanvasElement {
  const W = 720;
  const M = 48; // margin ซ้าย/ขวา

  // ความสูงคำนวณจาก content จริง (ไม่ fix 960 ตายตัว) — ทริป 1-2 stop ไม่ต้องมีที่ว่างเวิ้งว้างเหนือ footer
  const stops = plan.stops.slice(0, 6);
  const rowH = 58;
  const topY = 176;
  let bottomOfStops = topY + rowH * stops.length;
  if (plan.stops.length > 6) bottomOfStops += rowH * 0.55;
  const dividerY = bottomOfStops + 18;
  const labelY = dividerY + 54;
  const amountBaseline = labelY + 96;
  const captionY = amountBaseline + 52;
  const footerH = 104;
  const H = Math.max(860, Math.round(captionY + 56 + footerH));

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // v0.8: ทั้งการ์ดใช้ IBM Plex Sans Thai + IBM Plex Mono ชุดเดียวกับในแอป (700 คือหนักสุดของ Plex Thai)
  const sans = fontStack("--font-plex-thai", "system-ui, sans-serif");
  // ต่อ sans ท้าย stack ของ mono: IBM Plex Mono ไม่มี ฿ (U+0E3F) และไม่มีอักษรไทย — ถ้าไม่ต่อ
  // เลขได้ mono แต่ ฿ กับชื่อร้านไทยจะหลุดไปฟอนต์ระบบ กลายเป็นสองตระกูลในบรรทัดเดียว
  const mono = `${fontStack("--font-mono", "ui-monospace")}, ${sans}, monospace`;
  const font = (size: number, weight = 600) => `${weight} ${size}px ${sans}`;
  const displayFont = (size: number, weight = 700) => `${weight} ${size}px ${sans}`;
  const monoFont = (size: number, weight = 600) => `${weight} ${size}px ${mono}`;

  // พื้นขาวล้วน — Forest on White
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);

  // ===== header: badge mono เขียว + วันที่/ต้นทาง =====
  g.font = monoFont(13, 700);
  setTracking(g, 1.4);
  const badgeLabel = "GONAI · TRIP RECAP";
  const badgeW = g.measureText(badgeLabel).width + 34;
  g.fillStyle = ACCENT;
  roundRect(g, M, 44, badgeW, 32, 16);
  g.fill();
  g.fillStyle = "#ffffff";
  g.textBaseline = "middle";
  g.fillText(badgeLabel, M + 17, 44 + 17);
  setTracking(g, 0);
  g.textBaseline = "alphabetic";

  g.font = font(24, 500);
  g.fillStyle = MUT;
  g.fillText(
    new Date(plan.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) +
      ` · ${plan.origin_name} → Siam`,
    M,
    116,
  );

  // ===== stops: timeline เส้นบาง + จุดเช็คเขียว (สูงสุด 6 บรรทัด) =====
  const dotR = 10;
  const dotX = M + dotR;

  if (stops.length > 1) {
    g.strokeStyle = "rgba(30,127,79,0.28)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(dotX, topY + rowH * 0.5);
    g.lineTo(dotX, topY + rowH * (stops.length - 1) + rowH * 0.5);
    g.stroke();
  }

  stops.forEach((s, i) => {
    const cy = topY + rowH * i + rowH * 0.5;

    g.fillStyle = BRIGHT;
    g.beginPath();
    g.arc(dotX, cy, dotR, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = "#ffffff";
    g.lineWidth = 2.3;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(dotX - 4.2, cy);
    g.lineTo(dotX - 1, cy + 3.6);
    g.lineTo(dotX + 4.6, cy - 4.2);
    g.stroke();

    const cost = s.actual_cost ?? s.est_cost;
    const name = s.venue.name_th.length > 26 ? s.venue.name_th.slice(0, 25) + "…" : s.venue.name_th;
    g.textBaseline = "middle";
    g.font = font(25, 600);
    g.fillStyle = INK;
    g.fillText(name, dotX + dotR + 18, cy);
    g.font = monoFont(25, 700);
    const costText = `${cost}฿`;
    g.fillText(costText, W - M - g.measureText(costText).width, cy);
    g.textBaseline = "alphabetic";
  });

  if (plan.stops.length > 6) {
    g.font = font(22, 500);
    g.fillStyle = MUT;
    g.fillText(`+ ${plan.stops.length - 6} more stops`, dotX + dotR + 18, bottomOfStops - rowH * 0.55 + 8);
  }

  // เส้นคั่น — hairline
  g.strokeStyle = HAIRLINE;
  g.beginPath();
  g.moveTo(M, dividerY);
  g.lineTo(W - M, dividerY);
  g.stroke();

  // ===== ตัวเลขใหญ่: จ่ายจริง — มาร์กเกอร์เขียวสดหลังตัวเลข ตัวหนังสือหมึกทับด้านบน =====
  g.fillStyle = MUT;
  g.font = font(28, 600);
  g.fillText("Actually spent today", M, labelY);

  const actual = plan.budget_actual ?? plan.spent;
  const over = actual > plan.budget_planned;
  const amountText = `${actual}฿`;
  const amountSize = 84;
  g.font = monoFont(amountSize, 700);
  const amountW = g.measureText(amountText).width;
  // มาร์กเกอร์เกาะโคนตัวเลข ไม่ทับกลางตัวอักษร — ตัวเลขคือข้อมูลสำคัญสุดในรูปนี้ ต้องอ่านง่ายเต็มที่
  g.fillStyle = BRIGHT;
  roundRect(g, M - 6, amountBaseline - amountSize * 0.12, amountW + 14, amountSize * 0.22, 6);
  g.fill();
  g.fillStyle = INK;
  g.fillText(amountText, M, amountBaseline);

  g.fillStyle = over ? BAD : OK;
  g.font = font(27, 600);
  g.fillText(
    over
      ? `Budget ${plan.budget_planned}฿ · over by ${actual - plan.budget_planned}฿`
      : `Budget ${plan.budget_planned}฿ · under budget ✓`,
    M,
    amountBaseline + 52,
  );

  // ===== footer band — ขาว + เส้นหมึกบาง 1.5px ด้านบน ไม่มี gradient =====
  const footerY = H - footerH;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, footerY);
  g.lineTo(W, footerY);
  g.stroke();

  const footerSize = 27;
  g.font = displayFont(footerSize, 700);
  const pre = "GoNai — know ";
  const marked = "every baht";
  const post = " before you leave";
  const preW = g.measureText(pre).width;
  const markedW = g.measureText(marked).width;
  const footerBaseline = footerY + footerH / 2 + footerSize * 0.34;

  g.fillStyle = BRIGHT;
  // แถบมาร์กเกอร์เกาะโคนตัวอักษร ไม่พาดกลางคำ — ค่าเดิม (-0.28/0.34) จูนไว้กับ x-height ของ Bricolage
  // พอเป็น Plex Thai ที่ตัวเตี้ยกว่า แถบเลยขึ้นไปคาดกลางคำเหมือนขีดฆ่า
  roundRect(g, M + preW - 3, footerBaseline - footerSize * 0.1, markedW + 6, footerSize * 0.22, 3);
  g.fill();

  g.fillStyle = INK;
  g.fillText(pre + marked + post, M, footerBaseline);

  // ทับตัว G ด้วย gradient แบรนด์ — ให้การ์ดแชร์ถือโลโก้เดียวกับในแอป
  const gGrad = g.createLinearGradient(M, footerBaseline, M + footerSize * 0.85, footerBaseline - footerSize * 0.9);
  for (const [stop, color] of BRAND_GRAD) gGrad.addColorStop(stop, color);
  g.fillStyle = gGrad;
  g.fillText("G", M, footerBaseline);

  return c;
}

export default function TripRecap({ plan, onShared }: { plan: ExpandedPlan; onShared: (m: string) => void }) {
  // อุ่นฟอนต์ไว้ตั้งแต่การ์ดโผล่ ไม่ใช่ตอนกดแชร์ — canvas วาดด้วยฟอนต์ที่ยังไม่โหลดจะตกไปฟอนต์ระบบเงียบๆ
  // และห้าม await ในจังหวะกดปุ่ม เพราะ navigator.share ต้องอยู่ใน user gesture เดิม (iOS ตัดทิ้ง)
  useEffect(() => {
    if (!document.fonts) return;
    const sans = fontStack("--font-plex-thai", "system-ui");
    const mono = fontStack("--font-mono", "monospace");
    const specs = [
      `500 24px ${sans}`,
      `600 25px ${sans}`,
      `700 27px ${sans}`,
      `700 13px ${mono}`,
      `700 25px ${mono}`,
      `700 84px ${mono}`,
    ];
    for (const s of specs) document.fonts.load(s).catch(() => {});
  }, []);

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

  // โมเมนต์อวด = จบทริป — ให้ทั้งรูป (โพสต์) และลิงก์ view-only (ส่งในแชท) คู่กัน
  const copyLink = async () => {
    track("share_link_copy", { plan_id: plan.id, from: "recap" });
    try {
      await navigator.clipboard.writeText(window.location.origin + plan.share_path);
      onShared("Link copied 🔗 — anyone can view, no login");
    } catch {
      onShared("Couldn't copy — try again");
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={share} className="gn-press o-pill-primary o-btn-label flex-1 py-3">
        📸 Share recap
      </button>
      <button onClick={copyLink} className="gn-press o-pill-dark o-btn-label shrink-0 px-4 py-3">
        🔗 Copy link
      </button>
    </div>
  );
}
