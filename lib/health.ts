// คำตัดสิน health — pure function แยกจาก route เพื่อ test ตรงๆ ได้ (route แค่ห่อ HTTP)
// ปัญหาเดียวที่เช็คตอนนี้: production หลุดมาอยู่บน JSON store (= Supabase env หาย)
export function healthProblem(env: NodeJS.ProcessEnv, supabaseOn: boolean): string | null {
  if (env.NODE_ENV === "production" && !supabaseOn) return "json_store_in_production";
  return null;
}
