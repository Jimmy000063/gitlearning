"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { RepoState } from "@/engine/types";
import { fileZones, headTree, type ZoneState } from "@/engine/repo";

const ZONES = [
  { key: "working", title: "Working Directory", emoji: "🛠️", sub: "your desk — files you edit", accent: "from-pink/30" },
  { key: "staged", title: "Staging Area", emoji: "📦", sub: "the loading dock — next snapshot", accent: "from-amber/30" },
  { key: "repo", title: "Repository", emoji: "🗄️", sub: "the photo album — last commit", accent: "from-cyan/30" },
] as const;

type Chip = { label: string; cls: string; tip: string };

function chipFor(zone: (typeof ZONES)[number]["key"], z: ZoneState): Chip | null {
  if (zone === "working") {
    if (z.conflict) return { label: "⚔ conflict", cls: "border-coral/70 bg-coral/20 text-coral", tip: "Contains conflict markers. Edit it, then git add." };
    if (z.working === "untracked") return { label: "U new", cls: "border-pink/60 bg-pink/15 text-pink", tip: "Untracked: Git has never seen this file." };
    if (z.working === "modified") return { label: "M edited", cls: "border-amber/60 bg-amber/15 text-amber", tip: "Modified since you last staged it." };
    if (z.working === "deleted") return { label: "D deleted", cls: "border-coral/60 bg-coral/10 text-coral line-through", tip: "Deleted from your desk." };
    if (z.working === "clean") return { label: "", cls: "border-white/10 bg-white/5 text-white/60", tip: "Unchanged." };
    return null;
  }
  if (zone === "staged") {
    if (z.staged === "new file") return { label: "A added", cls: "border-lime/60 bg-lime/15 text-lime", tip: "Staged as a new file for the next commit." };
    if (z.staged === "modified") return { label: "M staged", cls: "border-lime/60 bg-lime/15 text-lime", tip: "This version will go into the next commit." };
    if (z.staged === "deleted") return { label: "D staged", cls: "border-lime/60 bg-lime/10 text-lime line-through", tip: "The next commit will delete this file." };
    if (z.staged === "clean") return { label: "", cls: "border-white/10 bg-white/5 text-white/60", tip: "Same as the last commit." };
    return null;
  }
  return z.committed ? { label: "", cls: "border-cyan/30 bg-cyan/10 text-cyan/90", tip: "Saved safely in the last commit." } : null;
}

export function FilesView({ state, className = "" }: { state: RepoState; className?: string }) {
  const zones = fileZones(state);
  const head = headTree(state);

  return (
    <div className={`grid grid-cols-3 gap-2 p-3 ${className}`}>
      {ZONES.map((zone, zi) => {
        const disabled = zi > 0 && !state.initialized;
        return (
          <div key={zone.key} className={`relative flex min-h-0 flex-col rounded-xl border border-white/10 bg-gradient-to-b ${zone.accent} to-transparent p-2.5 ${disabled ? "opacity-30" : ""}`}>
            <div className="mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{zone.emoji}</span>
                <span className="truncate">{zone.title}</span>
              </div>
              <div className="truncate text-[10px] text-white/45">{disabled ? "run git init first" : zone.sub}</div>
            </div>
            <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              <AnimatePresence initial={false}>
                {zones.map((z) => {
                  const chip = disabled ? null : chipFor(zone.key, z);
                  if (!chip) return null;
                  const content = zone.key === "working" ? state.working[z.name] : zone.key === "staged" ? state.index[z.name] : head[z.name];
                  return (
                    <motion.div
                      key={z.name + chip.label}
                      layout
                      initial={{ opacity: 0, scale: 0.6, x: zi === 0 ? 0 : -30 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.6, x: 30 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      title={`${chip.tip}\n\n${content ?? "(deleted)"}`}
                      className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1 font-mono text-[11px] ${chip.cls}`}
                    >
                      <span className="truncate">📄 {z.name}</span>
                      {chip.label && <span className="shrink-0 text-[9px] font-bold uppercase opacity-90">{chip.label}</span>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!disabled && zones.every((z) => !chipFor(zone.key, z)) && <div className="mt-2 text-center text-[10px] text-white/30">empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
