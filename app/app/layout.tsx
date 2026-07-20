import Shell from "../shell";

// โซนแอปเท่านั้นที่ได้ header/nav/footer — landing (/) เป็นหน้า marketing ล้วน
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
