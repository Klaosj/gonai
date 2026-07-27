// กันชนชั้นนอกสุดของ API route — store/catalog พังตอน runtime (Supabase pause/ล่ม/URL เพี้ยน)
// ต้องตอบ 503 JSON ที่อ่านรู้เรื่อง ไม่ใช่ error ดิบของ Next · log ฝั่ง server เสมอ
//
// Args เป็น generic แบบ variadic (ไม่ใช่ (req, ctx) ตายตัว) เพราะ route handler ในโปรเจกต์นี้
// มีหลายรูปแบบ: () , (req: NextRequest) , (req: NextRequest, ctx: { params: Promise<...> })
// — ให้ TS infer จาก handler ที่ส่งเข้ามาเอง ไม่บังคับ NextRequest ให้แคบ/กว้างผิด (หนี strictFunctionTypes)
import { NextResponse } from "next/server";

type Handler<Args extends unknown[]> = (...args: Args) => Promise<Response>;

export function guarded<Args extends unknown[]>(handler: Handler<Args>): Handler<Args> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[api] unhandled:", e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false, error: "backend_unavailable" }, { status: 503 });
    }
  };
}
