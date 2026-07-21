"use client";
// Odometer — ตัวเลขหมุนเป็นหลักแนวตั้ง (แทน count-up เฉพาะตัวเลขใหญ่)
// pure CSS transform ต่อหลัก · tabular ด้วยความกว้าง ch คงที่ · reduced-motion ปิด transition ใน globals
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function Odo({ value, className = "" }: { value: number; className?: string }) {
  const chars = String(Math.max(0, Math.round(value))).split("");
  return (
    <span className={`gn-odo align-baseline ${className}`} aria-label={String(value)}>
      {chars.map((c, i) => (
        <span key={chars.length - i} className="gn-odo-col" style={{ height: "1em", width: "0.62em" }}>
          <span
            className="gn-odo-strip"
            style={{ transform: `translateY(-${Number(c)}em)` }}
          >
            {DIGITS.map((d) => (
              <span key={d} style={{ height: "1em", lineHeight: "1em", textAlign: "center" }}>
                {d}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
