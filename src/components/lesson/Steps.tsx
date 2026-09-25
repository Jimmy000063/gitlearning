"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lightbulb, Lock, Star } from "lucide-react";
import type { Lesson, Predict, TaskContext } from "@/content/types";
import { run, runScript } from "@/engine/commands";
import type { Line, RepoState } from "@/engine/types";
import { Bit, BitSays } from "@/components/Mascot";
import { Button } from "@/components/ui/Button";
import { CommitGraph } from "@/components/lab/CommitGraph";
import { GitLab } from "@/components/lab/GitLab";
import { useGitSession } from "@/components/lab/useGitSession";
import { DemoPlayer } from "./DemoPlayer";
import { play } from "@/lib/sound";

// ---------------------------------------------------------------- Hook ----

export function HookStep({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const [typed, setTyped] = useState("");
  const story = lesson.hook.story;
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 2;
      setTyped(story.slice(0, n));
      if (n >= story.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [story]);
  const done = typed.length >= story.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-10 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 12 }}
        className="relative mb-8 grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-violet/40 to-pink/30 text-7xl shadow-[0_0_80px_-10px_rgba(168,85,247,0.8)]"
      >
        <span className="animate-float">{lesson.hook.emoji}</span>
        <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/20" />
      </motion.div>
      <p className="min-h-[5.5rem] text-lg leading-relaxed text-white/85 md:text-xl">
        {typed}
        {!done && <span className="animate-blink text-pink">▍</span>}
      </p>
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-8">
            <h2 className="font-display text-2xl font-semibold leading-snug md:text-4xl">
              <span className="text-gradient">{lesson.hook.question}</span>
            </h2>
            <Button onClick={onNext} size="lg">
              Let&apos;s find out <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {!done && (
        <button onClick={() => setTyped(story)} className="mt-6 text-xs text-white/40 hover:text-white/70">
          skip ›
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------- Concept ----

export function ConceptStep({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const [watched, setWatched] = useState(false);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const a = lesson.concept.analogies;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionTitle kicker="Mental model" title="First, picture it" sub="Tap each card to lock in the idea." />
        <div className={`grid gap-4 ${a.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          {a.map((an, k) => {
            const open = flipped.has(k);
            return (
              <motion.button
                key={an.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: k * 0.12 }}
                whileHover={{ y: -6, rotate: k % 2 ? 0.8 : -0.8 }}
                onClick={() => {
                  setFlipped((f) => new Set(f).add(k));
                  if (!open) play("pop");
                }}
                className={`glass group relative overflow-hidden rounded-3xl p-6 text-left transition-colors ${open ? "border-violet/50" : ""}`}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet/20 blur-2xl transition group-hover:bg-pink/30" />
                <div className="mb-4 text-5xl">{an.emoji}</div>
                <div className="font-display text-base font-semibold">{an.title}</div>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 text-sm leading-relaxed text-white/75">
                      {an.text}
                    </motion.p>
                  ) : (
                    <motion.p exit={{ opacity: 0 }} className="mt-3 text-xs text-violet">
                      tap to reveal →
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle kicker="See it happen" title="Watch Git think" sub="Step through (or scrub the slider). Keep an eye on the graph and the three areas." />
        <DemoPlayer setup={lesson.concept.demo.setup} steps={lesson.concept.demo.steps} tabs={lesson.concept.demo.tabs} onFinished={() => setWatched(true)} />
      </section>

      <div className="flex items-center justify-end gap-4">
        {!watched && <span className="text-xs text-white/40">Finish the walkthrough to continue, or</span>}
        {!watched && (
          <button onClick={onNext} className="text-xs text-white/50 underline-offset-4 hover:underline">
            skip
          </button>
        )}
        <Button onClick={onNext} disabled={!watched}>
          Test my intuition <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Predict ----

export function PredictStep({ lesson, onNext }: { lesson: Lesson; onNext: (correctFirstTry: number) => void }) {
  const [q, setQ] = useState(0);
  const [score, setScore] = useState(0);
  const question = lesson.predict[q];
  const last = q === lesson.predict.length - 1;

  return (
    <div className="mx-auto max-w-4xl">
      <SectionTitle kicker={`Predict · ${q + 1} of ${lesson.predict.length}`} title="What do you think happens?" sub="Guess first, then see the truth. Wrong guesses teach the most." />
      <AnimatePresence mode="wait">
        <motion.div key={q} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <PredictCard
            p={question}
            onAnswered={(ok) => ok && setScore((s) => s + 1)}
            next={
              <Button onClick={() => (last ? onNext(score) : setQ(q + 1))}>
                {last ? "Take the challenge" : "Next question"} <ArrowRight size={16} />
              </Button>
            }
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PredictCard({ p, onAnswered, next }: { p: Predict; onAnswered: (correct: boolean) => void; next: React.ReactNode }) {
  const before = useMemo(() => (p.setup ? runScript(p.setup) : null), [p]);
  const reveal = useMemo(() => {
    if (!before || !p.commands) return null;
    let s = before;
    const lines: Line[] = [];
    for (const c of p.commands) {
      const r = run(s, c);
      lines.push({ text: c, kind: "cmd" }, ...r.lines);
      s = r.state;
    }
    return { state: s, lines };
  }, [before, p]);
  const [picked, setPicked] = useState<number | null>(null);
  const [showAfter, setShowAfter] = useState(false);

  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    const ok = !!p.options[k].correct;
    onAnswered(ok);
    play(ok ? "success" : "error");
    if (reveal) setTimeout(() => setShowAfter(true), 700);
  };

  const correct = picked !== null && p.options[picked].correct;
  const graphState = showAfter && reveal ? reveal.state : before;

  return (
    <div className="flex flex-col gap-5">
      <div className="glass rounded-3xl p-6">
        <p className="font-display text-lg leading-snug md:text-xl">{p.prompt}</p>
        {before && (
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative rounded-2xl border border-white/10 bg-black/30">
              <span className={`absolute right-3 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${showAfter ? "bg-lime/20 text-lime" : "bg-white/10 text-white/60"}`}>
                {showAfter ? "after" : "before"}
              </span>
              <CommitGraph state={graphState!} className="h-[190px]" />
            </div>
            {p.commands && (
              <div className="rounded-2xl border border-white/10 bg-[#07051a] p-3 font-mono text-xs md:w-64">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{showAfter ? "output" : "about to run"}</div>
                {(showAfter && reveal ? reveal.lines : p.commands.map((c) => ({ text: c, kind: "cmd" as const }))).slice(0, 14).map((l, i) => (
                  <div key={i} className={l.kind === "cmd" ? "text-white" : l.kind === "err" ? "text-coral" : "text-white/60"}>
                    {l.kind === "cmd" && <span className="text-lime">❯ </span>}
                    {l.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {p.options.map((o, k) => {
          const isPicked = picked === k;
          const state = picked === null ? "idle" : o.correct ? "right" : isPicked ? "wrong" : "dim";
          return (
            <motion.button
              key={k}
              onClick={() => choose(k)}
              whileHover={picked === null ? { scale: 1.01, x: 4 } : {}}
              animate={state === "wrong" ? { x: [0, -8, 8, -4, 0] } : {}}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                state === "idle"
                  ? "border-white/10 bg-white/[0.04] hover:border-violet/60 hover:bg-violet/10"
                  : state === "right"
                    ? "border-lime/60 bg-lime/10"
                    : state === "wrong"
                      ? "border-coral/60 bg-coral/10"
                      : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${state === "right" ? "bg-lime text-black" : state === "wrong" ? "bg-coral text-black" : "bg-white/10"}`}>
                  {state === "right" ? "✓" : state === "wrong" ? "✗" : String.fromCharCode(65 + k)}
                </span>
                <span className="font-medium">{o.text}</span>
              </div>
              <AnimatePresence>
                {picked !== null && (isPicked || o.correct) && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 pl-10 text-sm text-white/75">
                    {o.why}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {picked !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
            <BitSays mood={correct ? "happy" : "oops"} size={52}>
              {correct ? "Nailed it! Your mental model is solid. ✨" : "Not quite, and that's great! Mistakes you understand are the ones you never repeat."}
            </BitSays>
            {next}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------- Challenge ----

export function ChallengeStep({ lesson, onNext }: { lesson: Lesson; onNext: (stars: number) => void }) {
  const ch = lesson.challenge;
  const initial = useMemo(() => runScript(ch.setup), [ch]);
  const intro: Line[] = [{ text: `🎯 ${ch.brief}`, kind: "info" }, { text: "Type commands below. \"help\" lists everything; ↑ recalls history.", kind: "muted" }];
  const session = useGitSession(initial, intro);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);
  const ctx: TaskContext = session.trail;

  const results = ch.tasks.map((t) => t.check(session.state, ctx));
  const allDone = results.every(Boolean);

  useEffect(() => {
    if (allDone && !done) {
      setDone(true);
      play("success");
    }
  }, [allDone, done]);

  const cmds = session.commands;
  let stars = cmds <= ch.par + 2 ? 3 : cmds <= ch.par * 2 + 4 ? 2 : 1;
  if (hints >= ch.hints.length) stars = Math.min(stars, 2);

  const restart = () => {
    session.reset(initial, intro);
    setDone(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle kicker="Challenge" title="Your turn, for real" sub="A real (simulated) terminal. Experiment freely: you can undo anything." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="glass border-gradient rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Bit mood={done ? "happy" : "think"} size={48} />
            <p className="pt-1 text-[15px] leading-relaxed text-white/90">{ch.brief}</p>
          </div>
        </div>
        <div className="glass rounded-3xl p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-white/60">Objectives</span>
            <span className="flex items-center gap-0.5">
              {[1, 2, 3].map((n) => (
                <Star key={n} size={13} className={n <= stars ? "fill-amber text-amber" : "text-white/20"} />
              ))}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {ch.tasks.map((t, k) => (
              <motion.li key={t.label} animate={results[k] ? { scale: [1, 1.05, 1] } : {}} className={`flex items-start gap-2 text-sm ${results[k] ? "text-lime" : "text-white/75"}`}>
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${results[k] ? "border-lime bg-lime text-black" : "border-white/30"}`}>
                  {results[k] && <Check size={11} strokeWidth={3} />}
                </span>
                {t.label}
              </motion.li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-white/40">
            {cmds} command{cmds === 1 ? "" : "s"} · par {ch.par}
          </div>
        </div>
      </div>

      <GitLab session={session} tabs={ch.tabs ?? ["files"]} onReset={restart} suggestions={ch.suggestions} autoFocus />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {ch.hints.slice(0, hints).map((h, k) => (
            <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 rounded-xl bg-amber/10 px-3 py-1.5 text-sm text-amber">
              <Lightbulb size={14} /> <span className="font-mono text-[13px]">{h}</span>
            </motion.div>
          ))}
          {hints < ch.hints.length && !done && (
            <button onClick={() => setHints(hints + 1)} className="flex w-fit items-center gap-1.5 text-xs text-white/50 hover:text-amber">
              <Lightbulb size={13} /> {hints === 0 ? "Need a hint?" : hints === ch.hints.length - 1 ? "Show the answer (max 2★)" : "Another hint"}
            </button>
          )}
        </div>
        <AnimatePresence>
          {done && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-4">
              <span className="font-display text-lg text-lime">Challenge complete!</span>
              <Button onClick={() => onNext(stars)} size="lg">
                Claim reward <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Shared ----

export function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet">{kicker}</div>
      <h2 className="font-display text-2xl font-semibold md:text-3xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-mist">{sub}</p>}
    </div>
  );
}

export function LockedGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-white/5">
        <Lock size={32} className="text-white/50" />
      </div>
      <h2 className="font-display text-xl">This lesson is still locked</h2>
      <p className="text-sm text-mist">Finish the previous lesson first; each one builds on the last. Already know some Git?</p>
      <div className="flex gap-3">
        <Button href="/learn/" variant="ghost">
          Back to the map
        </Button>
        <Button onClick={onUnlock}>Unlock anyway</Button>
      </div>
    </div>
  );
}

export type { RepoState };
