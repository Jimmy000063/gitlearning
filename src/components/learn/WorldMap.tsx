"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Play, Star } from "lucide-react";
import { ALL_LESSONS, WORLDS, isUnlocked } from "@/content";
import type { World } from "@/content/types";
import { BADGES, type BadgeId } from "@/content/badges";
import { useProgress } from "@/store/progress";
import { levelFor } from "@/lib/levels";
import { useHydrated } from "@/lib/useHydrated";
import { Bit } from "@/components/Mascot";
import { Button } from "@/components/ui/Button";

export function WorldMap() {
  const hydrated = useHydrated();
  const p = useProgress();
  const completed = hydrated ? p.completed : {};
  const unlockAll = hydrated && p.unlockAll;
  const xp = hydrated ? p.xp : 0;
  const lv = levelFor(xp);
  const doneCount = Object.keys(completed).length;
  const current = ALL_LESSONS.find((l) => !completed[l.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-28 md:pt-32">
      {/* Profile / progress header */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border-gradient mb-16 grid gap-6 rounded-3xl p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
        <Bit mood={doneCount ? "happy" : "idle"} size={88} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">Your journey</div>
          <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
            {lv.emoji} Level {lv.level}: {lv.title}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet via-cyan to-pink" initial={{ width: 0 }} animate={{ width: `${lv.progress * 100}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </div>
            <span className="whitespace-nowrap text-xs text-mist">{lv.next ? `${xp} / ${lv.next.min} XP` : `${xp} XP · max level!`}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(BADGES) as BadgeId[]).map((b) => {
              const has = hydrated && p.badges.includes(b);
              return (
                <span
                  key={b}
                  title={`${BADGES[b].name}: ${BADGES[b].description}`}
                  className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${has ? "bg-white/10 shadow-[0_0_16px_-4px_rgba(167,139,250,0.9)]" : "bg-white/[0.03] opacity-30 grayscale"}`}
                >
                  {BADGES[b].emoji}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="text-sm text-mist">
            <span className="font-display text-2xl text-white">{doneCount}</span> / {ALL_LESSONS.length} lessons
          </div>
          {current && (
            <Button href={`/learn/${current.id}/`}>
              <Play size={15} /> {doneCount ? "Continue" : "Start"}: {current.title}
            </Button>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50">
            <input type="checkbox" checked={unlockAll} onChange={(e) => p.setUnlockAll(e.target.checked)} className="accent-violet" />
            I know some Git: unlock everything
          </label>
        </div>
      </motion.section>

      <div className="flex flex-col gap-24">
        {WORLDS.map((w, wi) => (
          <WorldSection key={w.id} world={w} index={wi} completed={completed} unlockAll={unlockAll} currentId={current?.id} />
        ))}
      </div>
    </div>
  );
}

const SPACING = 132;
const PATH_W = 340;

function WorldSection({ world, index, completed, unlockAll, currentId }: { world: World; index: number; completed: Record<string, number>; unlockAll: boolean; currentId?: string }) {
  const pts = world.lessons.map((_, i) => ({ x: PATH_W / 2 + Math.sin(i * 1.9 + index * 1.3) * 80, y: 90 + i * SPACING }));
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const my = (prev.y + p.y) / 2;
    return `${acc} C${prev.x},${my} ${p.x},${my} ${p.x},${p.y}`;
  }, "");
  const height = 90 + (world.lessons.length - 1) * SPACING + 110;
  const done = world.lessons.filter((l) => completed[l.id]).length;
  const flip = index % 2 === 1;

  return (
    <section className={`flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-center md:gap-20 ${flip ? "md:flex-row-reverse" : ""}`}>
      <motion.div initial={{ opacity: 0, x: flip ? 40 : -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} className="flex max-w-sm flex-col items-center text-center md:sticky md:top-32 md:items-start md:text-left">
        <div className="relative mb-6 h-40 w-40">
          <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: world.color, opacity: 0.35 }} />
          <motion.div
            className="relative grid h-full w-full place-items-center rounded-full text-6xl"
            style={{ background: `radial-gradient(circle at 30% 30%, ${world.color}, #1a1045 70%)`, boxShadow: `inset -12px -16px 40px rgba(0,0,0,0.6), 0 0 60px -10px ${world.color}` }}
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          >
            {world.emoji}
          </motion.div>
          <div className="absolute left-1/2 top-1/2 h-12 w-56 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border-2 opacity-40" style={{ borderColor: world.color }} />
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: world.color }}>
          World {world.n}
        </div>
        <h2 className="mt-1 font-display text-3xl font-bold">{world.title}</h2>
        <p className="mt-2 text-sm text-mist">{world.tagline}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${(done / world.lessons.length) * 100}%`, background: world.color }} />
          </div>
          {done}/{world.lessons.length} complete
        </div>
      </motion.div>

      <div className="relative shrink-0" style={{ width: PATH_W, height }}>
        <svg width={PATH_W} height={height} className="absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id={`path-${world.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={world.color} stopOpacity="0.9" />
              <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} strokeLinecap="round" />
          <motion.path
            d={d}
            fill="none"
            stroke={`url(#path-${world.id})`}
            strokeWidth={3}
            strokeDasharray="2 10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
        {world.lessons.map((l, i) => {
          const stars = completed[l.id] ?? 0;
          const unlocked = isUnlocked(l.id, completed, unlockAll);
          const isCurrent = l.id === currentId && unlocked;
          const p = pts[i];
          const node = (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 180, damping: 14 }}
              whileHover={unlocked ? { scale: 1.08 } : {}}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: p.x, top: p.y }}
            >
              <div className="relative">
                {isCurrent && <span className="absolute inset-[-10px] animate-ping rounded-full opacity-40" style={{ background: world.color }} />}
                <div
                  className={`relative grid h-[72px] w-[72px] place-items-center rounded-full border-4 text-xl font-bold transition ${unlocked ? "" : "grayscale"}`}
                  style={{
                    borderColor: stars ? world.color : unlocked ? `${world.color}99` : "rgba(255,255,255,0.12)",
                    background: stars ? `radial-gradient(circle at 30% 30%, ${world.color}, #2a1c6b)` : unlocked ? "#140f35" : "#0b0820",
                    boxShadow: unlocked ? `0 0 30px -6px ${world.color}` : "none",
                  }}
                >
                  {stars ? <Check size={28} strokeWidth={3} /> : unlocked ? <span className="text-white/90">{i + 1}</span> : <Lock size={20} className="text-white/30" />}
                </div>
                {isCurrent && (
                  <motion.span
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
                    style={{ background: world.color }}
                  >
                    {stars ? "replay" : "start here"}
                  </motion.span>
                )}
              </div>
              <div className="mt-2 w-44 rounded-xl bg-[#07051a]/80 px-2 py-1.5 text-center backdrop-blur-sm">
                <div className={`text-sm font-semibold leading-tight ${unlocked ? "text-white" : "text-white/35"}`}>{l.title}</div>
                <div className="mt-0.5 text-[11px] text-white/40">
                  {l.minutes} min · {l.xp} XP
                </div>
                {stars > 0 && (
                  <div className="mt-1 flex justify-center gap-0.5">
                    {[1, 2, 3].map((n) => (
                      <Star key={n} size={12} className={n <= stars ? "fill-amber text-amber" : "text-white/20"} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
          return unlocked ? (
            <Link key={l.id} href={`/learn/${l.id}/`} aria-label={l.title}>
              {node}
            </Link>
          ) : (
            <div key={l.id} title="Complete the previous lesson to unlock">
              {node}
            </div>
          );
        })}
      </div>
    </section>
  );
}
