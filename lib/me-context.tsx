"use client";
// MeProvider — โหลด /api/me ครั้งเดียวต่อ shell mount แชร์ทุกหน้าในโซนแอป (T2.1)
// แทนที่ fetch ซ้ำเดิม 2-3 จุด (shell header + me page + planner last-trip card)
// error ส่งออกมาด้วยเผื่อหน้าที่ต้องโชว์ error UI จริง (เช่น me page) — แต่ shell header ไม่ใช้ ตั้งใจพังเงียบ
import { createContext, useContext } from "react";
import { useApiResource } from "./use-api-resource";
import type { MeResponse } from "./types";

interface MeCtxValue {
  me: MeResponse | null;
  error: boolean;
  reload: () => void;
}

const MeCtx = createContext<MeCtxValue>({ me: null, error: false, reload: () => {} });
export const useMe = () => useContext(MeCtx);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const { data, error, reload } = useApiResource<MeResponse>("/api/me");
  return <MeCtx.Provider value={{ me: data, error, reload }}>{children}</MeCtx.Provider>;
}
