"use client";
import { useEffect, useState } from "react";

/** True after the first client render, so localStorage-backed UI never mismatches the static HTML. */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
