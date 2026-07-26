"use client";
// fetch มาตรฐานเดียวผ่าน gn() — คืน loading/error/reload/setData ให้ทุกหน้าใช้ pattern เดียวกัน
// (T2.1 จะเอา hook นี้ไปทำ MeProvider ต่อ — signature คงเดิมไว้เผื่อใช้ซ้ำ)
import { useCallback, useEffect, useState } from "react";
import { gn } from "./api";

export function useApiResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    if (!path) return;
    setError(false);
    gn<T>(path).then(setData).catch(() => setError(true));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, reload: load, setData } as const;
}
