import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: "swap",
});

const fraunces = Fraunces({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  title: "GoNai — plan · go · ไม่เกินงบ",
  description:
    "วางแผนเที่ยว 1 วัน พร้อมค่าเดินทาง+งบทุกบาท ก่อนออกจากบ้าน — คัด Top 3 จากเงื่อนไขของคุณด้วยข้อมูลที่คนจริง validate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${plexThai.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body
        className="min-h-screen bg-bg text-ink antialiased"
        style={{ fontFamily: "var(--font-plex-thai), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
