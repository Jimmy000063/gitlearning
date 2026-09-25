"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type Mood = "idle" | "happy" | "think" | "oops" | "wow";

/** Bit — a little floating robot guide. Eyes follow the cursor; face reacts to mood. */
export function Bit({ mood = "idle", size = 72 }: { mood?: Mood; size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.max(1, Math.hypot(dx, dy));
      setEye({ x: (dx / d) * Math.min(3, d / 40), y: (dy / d) * Math.min(3, d / 40) });
    };
    window.addEventListener("pointermove", move);
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => {
      window.removeEventListener("pointermove", move);
      clearInterval(t);
    };
  }, []);

  const body = mood === "oops" ? "#fb7185" : mood === "happy" || mood === "wow" ? "#a78bfa" : "#8b5cf6";
  const eyeH = blink ? 0.6 : mood === "happy" ? 3 : mood === "wow" ? 7 : 5.5;

  return (
    <motion.svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0 overflow-visible drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]"
      animate={mood === "happy" || mood === "wow" ? { y: [0, -8, 0], rotate: [0, -6, 6, 0] } : mood === "oops" ? { x: [0, -3, 3, -2, 0] } : { y: [0, -4, 0] }}
      transition={mood === "oops" ? { duration: 0.4 } : { duration: mood === "idle" || mood === "think" ? 3 : 0.7, repeat: mood === "idle" || mood === "think" ? Infinity : 1 }}
    >
      <line x1="32" y1="10" x2="32" y2="4" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
      <motion.circle cx="32" cy="4" r="3" fill="#22d3ee" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <motion.rect x="8" y="10" width="48" height="42" rx="18" fill={body} animate={{ fill: body }} />
      <rect x="8" y="10" width="48" height="42" rx="18" fill="url(#bitShine)" />
      <rect x="15" y="19" width="34" height="22" rx="10" fill="#0b0820" />
      <motion.ellipse cx={25 + eye.x} cy={30 + eye.y} rx="3.2" initial={{ ry: 5.5 }} animate={{ ry: eyeH }} fill="#22d3ee" />
      <motion.ellipse cx={39 + eye.x} cy={30 + eye.y} rx="3.2" initial={{ ry: 5.5 }} animate={{ ry: eyeH }} fill="#22d3ee" />
      {mood === "happy" && <path d="M27 36 q5 4 10 0" stroke="#22d3ee" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      {mood === "oops" && <path d="M28 38 q4 -3 8 0" stroke="#fb7185" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      <circle cx="14" cy="44" r="2.5" fill="#f472b6" opacity="0.7" />
      <circle cx="50" cy="44" r="2.5" fill="#f472b6" opacity="0.7" />
      <rect x="22" y="52" width="6" height="6" rx="3" fill="#6d28d9" />
      <rect x="36" y="52" width="6" height="6" rx="3" fill="#6d28d9" />
      {mood === "think" && (
        <motion.text x="54" y="10" fontSize="12" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          ?
        </motion.text>
      )}
      <defs>
        <linearGradient id="bitShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

/** Bit with a speech bubble. */
export function BitSays({ mood = "idle", children, size = 64 }: { mood?: Mood; children: React.ReactNode; size?: number }) {
  return (
    <div className="flex items-start gap-3">
      <Bit mood={mood} size={size} />
      <AnimatePresence mode="wait">
        <motion.div
          key={typeof children === "string" ? children : undefined}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          className="glass relative mt-1 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-white/90"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
