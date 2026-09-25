"use client";
import { useEffect, useRef } from "react";

/** Fixed cosmic backdrop: aurora blobs, twinkling starfield, grain, and a cursor spotlight. */
export function Background() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    let raf = 0;
    let stars: { x: number; y: number; r: number; p: number; s: number }[] = [];
    const resize = () => {
      c.width = window.innerWidth * devicePixelRatio;
      c.height = window.innerHeight * devicePixelRatio;
      const n = Math.floor((window.innerWidth * window.innerHeight) / 5000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.3 * devicePixelRatio + 0.2,
        p: Math.random() * Math.PI * 2,
        s: 0.4 + Math.random() * 1.6,
      }));
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (t: number) => {
      g.clearRect(0, 0, c.width, c.height);
      for (const st of stars) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(st.p + (t / 1000) * st.s));
        g.globalAlpha = reduce ? 0.6 : a;
        g.fillStyle = st.r > 1.2 ? "#c4b5fd" : "#ffffff";
        g.beginPath();
        g.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        g.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    const move = (e: PointerEvent) => {
      if (spot.current) spot.current.style.transform = `translate3d(${e.clientX - 300}px, ${e.clientY - 300}px, 0)`;
    };
    window.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1045_0%,#04020d_60%)]" />
      <div className="animate-aurora absolute -left-1/4 -top-1/4 h-[70vh] w-[70vw] rounded-full bg-violet/25 blur-[120px]" />
      <div className="animate-aurora absolute -right-1/4 top-1/3 h-[60vh] w-[60vw] rounded-full bg-cyan/15 blur-[140px] [animation-delay:-6s]" />
      <div className="animate-aurora absolute bottom-[-20%] left-1/4 h-[50vh] w-[50vw] rounded-full bg-pink/15 blur-[140px] [animation-delay:-12s]" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div
        ref={spot}
        className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_65%)] transition-transform duration-300 ease-out"
      />
      <div className="noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}
