// โลโก้ GoNai — วาดใหม่เป็น SVG/CSS จากไฟล์โลโก้ต้นฉบับ (Downloads/Stylized GoNai Logo)
// เพื่อให้คมทุกขนาด พื้นหลังโปร่ง และ wordmark ใช้ Bricolage ตัวเดียวกับ display font ของแอป
// ขนาดคุมด้วย font-size ที่ครอบ เช่น <Logo className="text-[19px]" /> — สไตล์อยู่ที่ .gn-logo-* ใน globals.css

function Plane() {
  // เครื่องบินเชิดหัวขึ้นขวา (Material Symbols "flight takeoff" ตัดเส้นพื้นออก — Apache 2.0)
  return (
    <svg className="gn-logo-plane" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.07 9.64c-.21-.8-1.04-1.28-1.84-1.06L14.92 10L8.02 3.57L6.09 4.08l4.14 7.17l-4.97 1.33l-1.97-1.54l-1.45.39l2.59 4.49s7.12-1.9 16.57-4.43c.81-.23 1.28-1.05 1.07-1.85z"
      />
    </svg>
  );
}

function ThaiFlag() {
  // ธงไตรรงค์บนเสา — สัดส่วนแถบ 1:1:2:1:1 · เส้นขอบบางกันแถบขาวจมหายบนพื้นขาว
  return (
    <svg className="gn-logo-flag" viewBox="0 0 30 23" aria-hidden="true">
      <rect x="0.5" y="0" width="2.4" height="23" rx="1.2" fill="#8b8f8a" />
      <g>
        <rect x="2.9" y="1" width="26" height="3" fill="#e70000" />
        <rect x="2.9" y="4" width="26" height="3" fill="#ffffff" />
        <rect x="2.9" y="7" width="26" height="6" fill="#001b9a" />
        <rect x="2.9" y="13" width="26" height="3" fill="#ffffff" />
        <rect x="2.9" y="16" width="26" height="3" fill="#e70000" />
        <rect x="3.15" y="1.25" width="25.5" height="17.5" fill="none" stroke="rgba(18,20,17,0.18)" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export default function Logo({ tagline = false, className = "" }: { tagline?: boolean; className?: string }) {
  return (
    <span className={`gn-logo ${className}`} role="img" aria-label="GoNai — AI trip planner & activity">
      <span aria-hidden="true" className="gn-logo-word">
        <span className="gn-logo-g">G</span>
        <span className="gn-logo-o">
          o
          <Plane />
        </span>
        <span>Na</span>
        <span className="gn-logo-i">
          i
          <ThaiFlag />
        </span>
      </span>
      {tagline && (
        <span aria-hidden="true" className="gn-logo-tag">
          AI Trip Planner &amp; Activity
        </span>
      )}
    </span>
  );
}
