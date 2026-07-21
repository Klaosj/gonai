// (11) page transition — template re-mount ทุกครั้งที่เปลี่ยน route ในโซนแอป
// → ทุกหน้าเข้าแบบ fade+rise เบาๆ (คลาสถูกปิดใน prefers-reduced-motion)
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="gn-page">{children}</div>;
}
