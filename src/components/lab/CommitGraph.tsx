"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RepoState } from "@/engine/types";
import { layoutGraph, type GraphNode } from "@/engine/layout";
import { short } from "@/engine/utils";

export const LANE_COLORS = ["#a78bfa", "#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#fb7185", "#60a5fa"];
const COL_W = 84;
const LANE_H = 84;
const PAD_X = 48;
const TOP = 64;
const R = 13;

const spring = { type: "spring" as const, stiffness: 170, damping: 22 };

export function CommitGraph({ state, className = "", compact = false }: { state: RepoState; className?: string; compact?: boolean }) {
  const g = useMemo(() => layoutGraph(state), [state]);
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<GraphNode | null>(null);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of g.nodes) m.set(n.id, { x: PAD_X + n.col * COL_W, y: TOP + n.lane * LANE_H });
    return m;
  }, [g]);
  const laneOf = useMemo(() => new Map(g.nodes.map((n) => [n.id, n.lane])), [g]);

  const width = Math.max(PAD_X * 2 + (g.cols - 1) * COL_W + 40, 320);
  const height = TOP + (g.lanes - 1) * LANE_H + 52;

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: "smooth" });
  }, [g.cols]);

  // Group refs by commit so labels stack instead of overlapping.
  const refsByCommit = useMemo(() => {
    const m = new Map<string, typeof g.refs>();
    for (const r of g.refs) m.set(r.target, [...(m.get(r.target) ?? []), r]);
    return m;
  }, [g]);

  if (!state.initialized) {
    return (
      <Empty className={className} emoji="🪐" title="No repository here yet" body={<>This folder is just a folder. Run <code className="text-pink">git init</code> to give it a memory.</>} />
    );
  }
  if (!g.nodes.length) {
    return (
      <Empty className={className} emoji="✨" title="An empty timeline" body={<>Your first commit will appear here as a glowing star. Stage something with <code className="text-pink">git add</code>, then <code className="text-pink">git commit</code>.</>} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={scroller} className="scroll-thin h-full overflow-auto">
        <div className="relative" style={{ width, height, minHeight: "100%" }}>
          <svg width={width} height={height} className="absolute left-0 top-0 overflow-visible">
            <defs>
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <AnimatePresence>
              {g.edges.map((e) => {
                const a = pos.get(e.from)!;
                const b = pos.get(e.to)!;
                const d =
                  a.y === b.y
                    ? `M${a.x},${a.y} L${b.x},${b.y}`
                    : `M${a.x},${a.y} C${a.x + COL_W * 0.7},${a.y} ${b.x - COL_W * 0.7},${b.y} ${b.x},${b.y}`;
                return (
                  <motion.path
                    key={`${e.from}-${e.to}`}
                    initial={{ d, pathLength: 0, opacity: 0 }}
                    animate={{ d, pathLength: 1, opacity: e.ghost ? 0.25 : 0.85 }}
                    exit={{ opacity: 0 }}
                    transition={{ ...spring, pathLength: { duration: 0.5 } }}
                    fill="none"
                    stroke={LANE_COLORS[e.lane % LANE_COLORS.length]}
                    strokeWidth={3}
                    strokeDasharray={e.ghost ? "5 6" : undefined}
                    strokeLinecap="round"
                  />
                );
              })}
            </AnimatePresence>
            <AnimatePresence>
              {g.nodes.map((n) => {
                const p = pos.get(n.id)!;
                const color = LANE_COLORS[n.lane % LANE_COLORS.length];
                const isHead = g.headTarget === n.id;
                return (
                  <motion.g
                    key={n.id}
                    initial={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                    animate={{ x: p.x, y: p.y, scale: 1, opacity: n.ghost ? 0.35 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={spring}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {isHead && (
                      <motion.circle initial={{ r: R + 4 }} fill="none" stroke={color} strokeWidth={2} animate={{ r: [R + 4, R + 12], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
                    )}
                    <circle r={R} fill="#0a0720" stroke={color} strokeWidth={3} strokeDasharray={n.ghost ? "4 3" : undefined} filter={n.ghost ? undefined : "url(#glow)"} />
                    <circle r={n.merge ? 6 : 4.5} fill={color} />
                    {!compact && (
                      <>
                        <text y={R + 16} textAnchor="middle" className="fill-white/45 font-mono" fontSize={10}>
                          {short(n.id)}
                        </text>
                        <text y={R + 29} textAnchor="middle" className="fill-white/75" fontSize={10}>
                          {n.message.length > 13 ? n.message.slice(0, 12) + "…" : n.message}
                        </text>
                      </>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
          {/* Ref labels as HTML so they can be styled richly */}
          {[...refsByCommit.entries()].flatMap(([target, refs]) => {
            const p = pos.get(target);
            if (!p) return [];
            const lane = laneOf.get(target) ?? 0;
            return refs.map((r, i) => {
              const isHeadBranch = r.kind === "branch" && r.current;
              const style =
                r.kind === "head"
                  ? "bg-amber text-black"
                  : r.kind === "remote"
                    ? "border border-dashed border-white/30 bg-white/5 text-white/70"
                    : r.kind === "tag"
                      ? "bg-lime/90 text-black"
                      : isHeadBranch
                        ? "text-black"
                        : "bg-white/10 text-white";
              return (
                <motion.div
                  key={`${r.kind}:${r.name}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, left: p.x, top: p.y - R - 12 - (refs.length - 1 - i) * 22, y: 0 }}
                  transition={spring}
                  className={`pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold shadow-lg ${style}`}
                  style={isHeadBranch ? { background: LANE_COLORS[lane % LANE_COLORS.length], boxShadow: `0 0 18px ${LANE_COLORS[lane % LANE_COLORS.length]}88` } : undefined}
                >
                  {isHeadBranch && <span className="rounded bg-black/80 px-1 text-[9px] text-amber">HEAD</span>}
                  {r.kind === "tag" && "🏷"}
                  {r.kind === "remote" && "☁"}
                  {r.name}
                </motion.div>
              );
            });
          })}
        </div>
      </div>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass pointer-events-none absolute bottom-3 left-3 z-20 max-w-[80%] rounded-xl px-3 py-2 text-xs"
          >
            <div className="font-mono text-amber">{hover.id.slice(0, 12)}</div>
            <div className="text-white/90">{hover.message}</div>
            {hover.ghost && <div className="mt-1 text-coral">👻 Unreachable: no branch points here. Only the reflog remembers it.</div>}
            {hover.merge && <div className="mt-1 text-cyan">🔀 Merge commit: it has two parents.</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty({ className, emoji, title, body }: { className: string; emoji: string; title: string; body: React.ReactNode }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
      <motion.div className="text-4xl" animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        {emoji}
      </motion.div>
      <div className="font-display text-sm">{title}</div>
      <div className="max-w-xs text-xs text-mist">{body}</div>
    </div>
  );
}
