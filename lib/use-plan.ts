"use client";
// plan CRUD กลาง: act() PATCH หนึ่งเดียว lock ด้วย acting:string|null
// hook นี้ไม่ถือ state `plan` เอง (ต่างจากร่างเดิมในแผน) — เพราะ 2 จุดที่เรียกใช้
// (plan/[id] ผ่าน useApiResource, planner-client ผ่าน useState ของหน้าเอง) ถือ
// state `plan` ไว้นอก hook อยู่แล้ว ถ้า hook เก็บสำเนาอีกชุดจะกลายเป็น
// dual source of truth (state ค้าง ไม่ sync) — จึงรับ plan/setPlan จากภายนอกแทน
import { useCallback, useState } from "react";
import { gn } from "./api";
import type { ExpandedPlan } from "./server";

// error ล่าสุดจาก act() ที่พัง — เสริมเข้ามาเพิ่มเติม (Task 2.3) เพื่อให้ call site พิเศษ
// (เช่นปุ่ม "Start the trip" ที่ต้องแยกแยะ 409 already_active จากพังทั่วไป) อ่าน status/body ได้
// โดยไม่เปลี่ยน contract เดิมของ act() เลย — call site อื่นที่ไม่สนใจ lastError ไม่ต้องแก้อะไร
export interface PlanActionError {
  status: number;
  body: unknown;
}

export function usePlan(
  plan: ExpandedPlan | null,
  setPlan: (p: ExpandedPlan) => void,
): {
  act: (action: string, payload?: Record<string, unknown>, key?: string) => Promise<ExpandedPlan | null>;
  acting: string | null;
  lastError: PlanActionError | null;
} {
  const [acting, setActing] = useState<string | null>(null);
  const [lastError, setLastError] = useState<PlanActionError | null>(null);
  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}, key: string = action): Promise<ExpandedPlan | null> => {
      if (!plan || acting) return null; // กันกดซ้ำทุก action
      setActing(key);
      setLastError(null); // เคลียร์ error ค้างจากรอบก่อนก่อนยิงรอบใหม่
      try {
        const p = await gn<ExpandedPlan>(`/api/plans/${plan.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action, ...payload }),
        });
        setPlan(p);
        return p;
      } catch (e) {
        // gn() throw Error(`${status}: ${text}`) เสมอ — แกะ status + parse body (ถ้าเป็น JSON) เก็บไว้
        const msg = e instanceof Error ? e.message : "";
        const m = /^(\d+): ([\s\S]*)$/.exec(msg);
        if (m) {
          let body: unknown = m[2];
          try {
            body = JSON.parse(m[2]);
          } catch {
            /* ไม่ใช่ JSON — เก็บ raw text ไว้ */
          }
          setLastError({ status: Number(m[1]), body });
        }
        return null; // พัง = คืน null ให้ call site ตัดสินใจเอง (ไม่โชว์ toast แทนที่นี่)
      } finally {
        setActing(null);
      }
    },
    [plan, acting],
  );
  return { act, acting, lastError } as const;
}
