import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans_Thai, Instrument_Sans } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// v0.6 "Forest on White" — display font สลับจาก Fraunces (serif) เป็น Bricolage Grotesque (plan §2)
// ผูกกับ var เดิม --font-fraunces เพื่อไม่ต้องแตะ .o-serif/.gn-serif ทั่วแอป
const fraunces = Bricolage_Grotesque({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoNai — plan · go · never over budget",
  description:
    "Plan a full Bangkok day out with every baht counted before you leave — Top 3 picks validated by real visitors",
  // ชี้ตรงไปที่ public/icon.svg + public/apple-icon.png แทน Next's app/icon.svg
  // + app/apple-icon.png convention — เครื่อง dev นี้ path มี apostrophe
  // ("Klao's Workspace") ที่ทำให้ next-metadata-route-loader gen โค้ดพัง (unescaped
  // ' ใน string literal) จนทั้งแอป 500 ทุกหน้า ถ้ามีไฟล์ static convention พวกนี้ใน app/.
  // public/ ไม่ผ่าน loader นั้นเลย จึงปลอดภัย — ผลลัพธ์ที่ผู้ใช้เห็นเหมือนกันทุกประการ.
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plexThai.variable} ${instrumentSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body
        className="min-h-screen bg-bg text-ink antialiased"
        style={{ fontFamily: "var(--font-sans), var(--font-plex-thai), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
