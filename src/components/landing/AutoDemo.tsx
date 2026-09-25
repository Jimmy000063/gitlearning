"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { run } from "@/engine/commands";
import { emptyRepo } from "@/engine/repo";
import type { Line, RepoState } from "@/engine/types";
import { CommitGraph } from "@/components/lab/CommitGraph";
import { FilesView } from "@/components/lab/FilesView";

const SCRIPT = [
  "git init",
  'echo "Hello" > hello.txt',
  "git add hello.txt",
  'git commit -m "First commit"',
  "git switch -c feature",
  'echo "✨ magic" > magic.txt',
  "git add .",
  'git commit -m "Add magic"',
  "git switch main",
  'echo "Hello, galaxy" > hello.txt',
  'git commit -am "Update greeting"',
  "git merge feature",
];

/** Self-typing terminal that drives the real engine, looping forever while visible. */
export function AutoDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "-100px" });
  const [state, setState] = useState<RepoState>(emptyRepo);
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState("");
  const [step, setStep] = useState(0);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (step >= SCRIPT.length) {
      const t = setTimeout(() => {
        setState(emptyRepo());
        setLines([]);
        setStep(0);
      }, 4500);
      return () => clearTimeout(t);
    }
    const cmd = SCRIPT[step];
    if (typed.length < cmd.length) {
      const t = setTimeout(() => setTyped(cmd.slice(0, typed.length + 1)), 28 + Math.random() * 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const r = run(state, cmd);
      setState(r.state);
      setLines((l) => [...l, { text: cmd, kind: "cmd" as const }, ...r.lines].slice(-40));
      setTyped("");
      setStep(step + 1);
    }, 420);
    return () => clearTimeout(t);
  }, [visible, step, typed, state]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, typed]);

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07051a]/95 shadow-[0_0_80px_-20px_rgba(139,92,246,0.7)]">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-coral/80" />
          <span className="h-3 w-3 rounded-full bg-amber/80" />
          <span className="h-3 w-3 rounded-full bg-lime/80" />
          <span className="ml-3 text-xs text-white/40">live — real commands, real engine</span>
        </div>
        <div ref={termRef} className="scroll-thin h-[360px] overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed">
          {lines.map((l, i) =>
            l.kind === "cmd" ? (
              <div key={i} className="mt-1 text-white">
                <span className="text-lime">❯ </span>
                {l.text}
              </div>
            ) : (
              <div key={i} className={`whitespace-pre-wrap ${l.kind === "err" ? "text-coral" : l.kind === "success" ? "text-lime" : l.kind === "muted" ? "text-white/35" : "text-white/70"}`}>
                {l.text}
              </div>
            ),
          )}
          <div className="mt-1 text-white">
            <span className="text-lime">❯ </span>
            {typed}
            <span className="animate-blink text-pink">▍</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <motion.div className="glass rounded-3xl" layout>
          <div className="px-4 pt-3 text-xs font-semibold text-white/70">🌌 Commit graph</div>
          <CommitGraph state={state} className="h-[210px]" />
        </motion.div>
        <div className="glass rounded-3xl">
          <div className="px-4 pt-3 text-xs font-semibold text-white/70">🗂 The three areas</div>
          <FilesView state={state} className="h-[150px]" />
        </div>
      </div>
    </div>
  );
}
