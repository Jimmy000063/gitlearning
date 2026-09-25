"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { run, runScript } from "@/engine/commands";
import type { Line, RepoState } from "@/engine/types";
import type { DemoStep } from "@/content/types";
import type { LabTab } from "@/components/lab/GitLab";
import { CommitGraph } from "@/components/lab/CommitGraph";
import { FilesView } from "@/components/lab/FilesView";
import { ObjectsView } from "@/components/lab/ObjectsView";
import { RemoteView } from "@/components/lab/RemoteView";
import { BitSays } from "@/components/Mascot";
import { play } from "@/lib/sound";

interface Frame {
  state: RepoState;
  lines: Line[];
  say: string;
}

/** Scripted walkthrough with a scrubber: every step is a precomputed repo state. */
export function DemoPlayer({ setup, steps, tabs = ["files"], onFinished }: { setup: string[]; steps: DemoStep[]; tabs?: LabTab[]; onFinished?: () => void }) {
  const frames = useMemo<Frame[]>(() => {
    let s = runScript(setup);
    const out: Frame[] = [];
    for (const step of steps) {
      const lines: Line[] = [];
      for (const c of step.cmds ?? []) {
        const r = run(s, c);
        lines.push({ text: c, kind: "cmd" }, ...r.lines);
        s = r.state;
      }
      out.push({ state: s, lines, say: step.say });
    }
    return out;
  }, [setup, steps]);

  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const [tab, setTab] = useState<LabTab>(tabs[0]);
  const reported = useRef(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (i === frames.length - 1 && !reported.current) {
      reported.current = true;
      onFinished?.();
    }
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: "smooth" });
  }, [i, frames.length, onFinished]);

  useEffect(() => {
    if (!auto) return;
    if (i >= frames.length - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => go(i + 1), 3200);
    return () => clearTimeout(t);
  });

  const go = (n: number) => {
    const next = Math.max(0, Math.min(frames.length - 1, n));
    if (next !== i) play(frames[next].lines.some((l) => l.kind === "err") ? "error" : "pop");
    setI(next);
  };

  const frame = frames[i];
  const shown = frames.slice(0, i + 1).flatMap((f) => f.lines);

  return (
    <div className="glass border-gradient rounded-3xl p-4 md:p-5">
      <div className="mb-4 min-h-[76px]">
        <BitSays mood={i === frames.length - 1 ? "happy" : "idle"} size={56}>
          <span key={i}>
            <span className="mr-2 rounded-md bg-violet/30 px-1.5 py-0.5 font-mono text-[10px] text-violet">
              {i + 1}/{frames.length}
            </span>
            {frame.say}
          </span>
        </BitSays>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div ref={termRef} className="scroll-thin h-[330px] overflow-y-auto rounded-2xl border border-white/10 bg-[#07051a]/90 p-4 font-mono text-[12.5px] leading-relaxed">
          {shown.length === 0 && <div className="text-white/30">(no commands yet — press ▶)</div>}
          <AnimatePresence initial={false}>
            {shown.map((l, k) => (
              <motion.div key={k} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={l.kind === "cmd" ? "mt-1 text-white" : TEXT[l.kind]}>
                {l.kind === "cmd" ? (
                  <>
                    <span className="text-lime">❯ </span>
                    {l.text}
                  </>
                ) : (
                  <span className="whitespace-pre-wrap">{l.text || " "}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20">
            <CommitGraph state={frame.state} className="h-[180px]" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20">
            {tabs.length > 1 && (
              <div className="flex gap-1 px-2 pt-2">
                {tabs.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-2.5 py-0.5 text-[11px] ${tab === t ? "bg-white/10 text-white" : "text-white/50"}`}>
                    {t === "files" ? "🗂 Three Areas" : t === "objects" ? "🧬 Objects" : "☁️ Remote"}
                  </button>
                ))}
              </div>
            )}
            {tab === "files" && <FilesView state={frame.state} className="h-[134px]" />}
            {tab === "objects" && <ObjectsView state={frame.state} className="h-[134px]" />}
            {tab === "remote" && <RemoteView state={frame.state} className="h-[134px] overflow-auto" />}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="rounded-xl bg-white/5 p-2 hover:bg-white/10 disabled:opacity-30" aria-label="Previous step">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => (i === frames.length - 1 ? go(0) : setAuto(!auto))} className="rounded-xl bg-white/5 p-2 hover:bg-white/10" aria-label="Play">
          {i === frames.length - 1 ? <RotateCcw size={18} /> : auto ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={i}
          onChange={(e) => go(Number(e.target.value))}
          className="flex-1 accent-violet"
          aria-label="Scrub through the demo"
        />
        <motion.button
          onClick={() => go(i + 1)}
          disabled={i === frames.length - 1}
          animate={i < frames.length - 1 ? { boxShadow: ["0 0 0px #8b5cf6", "0 0 22px #8b5cf6", "0 0 0px #8b5cf6"] } : {}}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="flex items-center gap-1 rounded-xl bg-violet px-4 py-2 text-sm font-semibold disabled:opacity-30"
        >
          Next step <ChevronRight size={16} />
        </motion.button>
      </div>
    </div>
  );
}

const TEXT: Record<Line["kind"], string> = {
  out: "text-white/80",
  err: "text-coral",
  info: "text-cyan",
  success: "text-lime",
  warn: "text-amber",
  muted: "text-white/40",
  add: "text-lime",
  del: "text-coral",
  cmd: "text-white",
};
