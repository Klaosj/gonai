"use client";
// plan CRUD กลาง: act() PATCH หนึ่งเดียว lock ด้วย acting:string|null
// hook นี้ไม่ถือ state `plan` เอง (ต่างจากร่างเดิมในแผน) — เพราะ 2 จุดที่เรียกใช้
// (plan/[id] ผ่าน useApiResource, planner-client ผ่าน useState ของหน้าเอง) ถือ
// state `plan` ไว้นอก hook อยู่แล้ว ถ้า hook เก็บสำเนาอีกชุดจะกลายเป็น
// dual source of truth (state ค้าง ไม่ sync) — จึงรับ plan/setPlan จากภายนอกแทน
import { useCallback, useState } from "react";
import { gn } from "./api";
import type { ExpandedPlan } from "./server";

export function usePlan(
  plan: ExpandedPlan | null,
  setPlan: (p: ExpandedPlan) => void,
): { act: (action: string, payload?: Record<string, unknown>, key?: string) => Promise<ExpandedPlan | null>; acting: string | null } {
  const [acting, setActing] = useState<string | null>(null);
  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}, key: string = action): Promise<ExpandedPlan | null> => {
      if (!plan || acting) return null; // กันกดซ้ำทุก action
      setActing(key);
      try {
        const p = await gn<ExpandedPlan>(`/api/plans/${plan.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action, ...payload }),
        });
        setPlan(p);
        return p;
      } catch {
        return null; // พัง = คืน null ให้ call site ตัดสินใจเอง (ไม่โชว์ toast แทนที่นี่)
      } finally {
        setActing(null);
      }
    },
    [plan, acting],
  );
  return { act, acting } as const;
}
