import type { Metadata } from "next";
import { Noto_Sans_Thai, Playfair_Display } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_Thai({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["thai", "latin"],
  variable: "--font-noto",
  display: "swap",
});

const playfair = Playfair_Display({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ไปไหน PaiNai — plan · go · ไม่เกินงบ",
  description:
    "วางแผนเที่ยว 1 วัน พร้อมค่าเดินทาง+งบทุกบาท ก่อนออกจากบ้าน — คัด Top 3 จากเงื่อนไขของคุณด้วยข้อมูลที่คนจริง validate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${noto.variable} ${playfair.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{ fontFamily: "var(--font-noto), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
