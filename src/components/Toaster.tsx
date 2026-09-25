"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useToasts } from "@/store/toast";
import { play } from "@/lib/sound";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  const count = toasts.length;
  useEffect(() => {
    if (count) play("levelup");
  }, [count]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            className="glass border-gradient pointer-events-auto flex w-80 items-center gap-3 rounded-2xl p-4 text-left"
          >
            <motion.span initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", delay: 0.15 }} className="text-3xl">
              {t.emoji}
            </motion.span>
            <span>
              <span className="block text-sm font-semibold">{t.title}</span>
              {t.body && <span className="block text-xs text-mist">{t.body}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
