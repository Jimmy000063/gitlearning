"use client";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";

type Variant = "primary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet via-fuchsia-500 to-pink text-white shadow-[0_0_40px_-8px_rgba(168,85,247,0.8)] hover:shadow-[0_0_60px_-6px_rgba(168,85,247,1)]",
  ghost: "glass text-white/90 hover:bg-white/10",
};

/** Magnetic button: gently follows the cursor while hovered. */
export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  size = "md",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 15 });

  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.2);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };

  const cls = `relative inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-[box-shadow,background,opacity] duration-300 disabled:pointer-events-none disabled:opacity-40 ${
    size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm"
  } ${styles[variant]} ${className}`;

  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ x, y }} className="inline-block" whileTap={{ scale: 0.96 }}>
      {href ? (
        <Link href={href} className={cls}>
          {children}
        </Link>
      ) : (
        <button onClick={onClick} disabled={disabled} className={cls}>
          {children}
        </button>
      )}
    </motion.div>
  );
}
