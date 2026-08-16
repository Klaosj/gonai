import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

// ตัวอักษร v0.8 (2026-07-26) — ตระกูล IBM Plex ล้วน ทั้งแอป
//   ทุกอย่างที่เป็นตัวหนังสือ = IBM Plex Sans Thai (display + body + ชื่อร้านไทยจาก W2 ตัวเดียวกัน)
//   ตัวเลข/ป้าย mono = IBM Plex Mono
// เหตุผล: ไทยกับอังกฤษต้องเป็นตระกูลเดียวกัน ไม่งั้นชื่อร้านไทยจะเป็นฟอนต์ระบบที่ไม่เข้าพวก
// (เดิม Instrument Sans สำหรับ latin + Bricolage Grotesque เป็น display — ทั้งคู่ไม่มีอักษรไทย)
const plexThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  // 700 จำเป็น: canvas ของ TripRecap วาดตัวเลขเงินด้วย mono 700 — ถ้าไม่โหลดจะได้ตัวหนาปลอมที่เบราว์เซอร์สังเคราะห์
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // OG/Twitter image URL ต้อง resolve กับโดเมนจริง ไม่ใช่ localhost — ค่าเดียวกับที่ LINE callback ใช้
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "GoNai — plan · go · never over budget",
  description:
    "Plan a full Bangkok day out with every baht counted before you leave — Top 3 picks validated by real visitors",
  // ชี้ตรงไปที่ public/icon.svg + public/apple-icon.png แทน Next's app/icon.svg
  // + app/apple-icon.png convention — เดิมเครื่อง dev นี้ path มี apostrophe
  // ("Klao's Workspace" — เปลี่ยนชื่อเป็น "Klao Workspace" แล้ว 2026-08-12) ซึ่งทำให้
  // next-metadata-route-loader gen โค้ดพัง (unescaped ' ใน string literal) จนทั้งแอป
  // 500 ทุกหน้า ถ้ามีไฟล์ static convention พวกนี้ใน app/. คงไว้ที่ public/ ต่อไป —
  // ไม่ผ่าน loader นั้นเลย จึงปลอดภัยทุก path และผลลัพธ์ที่ผู้ใช้เห็นเหมือนกันทุกประการ.
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "GoNai — plan · go · never over budget",
    description: "Plan a full Bangkok day out with every baht counted before you leave",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plexThai.variable} ${plexMono.variable}`}>
      <body
        className="min-h-screen bg-bg text-ink antialiased"
        style={{ fontFamily: "var(--font-plex-thai), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
