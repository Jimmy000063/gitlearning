"use client";
import { create } from "zustand";

export interface Toast {
  id: number;
  title: string;
  body?: string;
  emoji?: string;
}

export const useToasts = create<{ toasts: Toast[]; dismiss: (id: number) => void }>((set, get) => ({
  toasts: [],
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

let nextId = 1;
export function toast(t: Omit<Toast, "id">) {
  const id = nextId++;
  useToasts.setState((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
  setTimeout(() => useToasts.getState().dismiss(id), 4500);
}
