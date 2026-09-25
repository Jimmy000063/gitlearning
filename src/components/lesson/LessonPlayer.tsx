"use client";
import { AnimatePresence, animate, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon, Star, X } from "lucide-react";
import { getLesson, isUnlocked, nextLesson } from "@/content";
import type { Lesson, World } from "@/content/types";
import { useProgress } from "@/store/progress";
import { useHydrated } from "@/lib/useHydrated";
import { Bit } from "@/components/Mascot";
import { Button } from "@/components/ui/Button";
import { ChallengeStep, ConceptStep, HookStep, LockedGate, PredictStep, SectionTitle } from "./Steps";

const STEPS = [
  { key: "hook", label: "Hook", emoji: "🎬" },
  { key: "concept", label: "Understand", emoji: "🧠" },
  { key: "predict", label: "Predict", emoji: "🤔" },
  { key: "challenge", label: "Challenge", emoji: "🎯" },
  { key: "recap", label: "Recap", emoji: "🏆" },
];

export function LessonPlayer({ id }: { id: string }) {
  const lesson = getLesson(id)!;
  const world = lesson.world;
  const hydrated = useHydrated();
  const { completed, unlockAll, setUnlockAll } = useProgress();
  const [step, setStep] = useState(0);
  const [predictScore, setPredictScore] = useState(0);
  const [stars, setStars] = useState(0);

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!hydrated) return <div className="min-h-screen" />;
  if (!isUnlocked(id, completed, unlockAll)) return <LockedGate onUnlock={() => setUnlockAll(true)} />;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 md:pt-32">
      <header className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: world.color }}>
              {world.emoji} World {world.n} · {world.title}
            </div>
            <h1 className="truncate font-display text-xl font-semibold md:text-2xl">{lesson.title}</h1>
          </div>
          <Link href="/learn/" className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Exit lesson">
            <X size={20} />
          </Link>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, k) => (
            <button
              key={s.key}
              onClick={() => k < step && go(k)}
              disabled={k >= step}
              className="group flex flex-1 flex-col gap-1.5 text-left disabled:cursor-default"
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #8b5cf6, ${world.color})` }}
                  initial={false}
                  animate={{ width: k < step || step === STEPS.length - 1 ? "100%" : k === step ? "50%" : "0%" }}
                />
              </div>
              <span className={`hidden text-[11px] sm:block ${k === step ? "text-white" : k < step ? "text-white/60 group-hover:text-white" : "text-white/30"}`}>
                {s.emoji} {s.label}
              </span>
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -24, filter: "blur(8px)" }} transition={{ duration: 0.4 }}>
          {step === 0 && <HookStep lesson={lesson} onNext={() => go(1)} />}
          {step === 1 && <ConceptStep lesson={lesson} onNext={() => go(2)} />}
          {step === 2 && (
            <PredictStep
              lesson={lesson}
              onNext={(score) => {
                setPredictScore(score);
                go(3);
              }}
            />
          )}
          {step === 3 && (
            <ChallengeStep
              lesson={lesson}
              onNext={(s) => {
                setStars(s);
                go(4);
              }}
            />
          )}
          {step === 4 && <RecapStep lesson={lesson} world={world} stars={stars} predictScore={predictScore} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function RecapStep({ lesson, world, stars, predictScore }: { lesson: Lesson; world: World; stars: number; predictScore: number }) {
  const completeLesson = useProgress((s) => s.completeLesson);
  const earn = useProgress((s) => s.earn);
  const [gained, setGained] = useState<number | null>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const awarded = useRef(false);
  const next = nextLesson(lesson.id);

  useEffect(() => {
    if (awarded.current) return;
    awarded.current = true;
    const bonus = predictScore * 10;
    const res = completeLesson(lesson.id, stars, lesson.xp + bonus, world.lessons.map((l) => l.id));
    if (lesson.badge) earn(lesson.badge);
    setGained(res.gained);
    import("canvas-confetti").then(({ default: confetti }) => {
      const colors = ["#a78bfa", "#22d3ee", "#f472b6", "#a3e635", "#fbbf24"];
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors }), 400);
    });
    // Runs once when the recap mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gained === null || !counter.current) return;
    const c = animate(0, gained, { duration: 1.4, ease: "easeOut", onUpdate: (v) => counter.current && (counter.current.textContent = `+${Math.round(v)}`) });
    return () => c.stop();
  }, [gained]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <Bit mood="wow" size={96} />
        <h2 className="font-display text-3xl font-bold md:text-5xl">
          <span className="text-gradient">Lesson complete!</span>
        </h2>
        <div className="flex gap-3">
          {[1, 2, 3].map((n) => (
            <motion.div key={n} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + n * 0.25, type: "spring", stiffness: 200 }}>
              <Star size={52} className={n <= stars ? "fill-amber text-amber drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" : "text-white/15"} />
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-6 text-sm text-mist">
          <span>
            <span ref={counter} className="font-display text-2xl text-lime">
              +0
            </span>{" "}
            XP
          </span>
          <span>
            🤔 {predictScore} prediction{predictScore === 1 ? "" : "s"} right first try
          </span>
        </div>
        {gained === 0 && <div className="text-xs text-white/40">Replay for more stars to earn more XP.</div>}
      </div>

      <div className="grid w-full gap-4 text-left md:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-3xl p-6">
          <SectionTitle kicker="Remember this" title="Key ideas" />
          <ul className="flex flex-col gap-3">
            {lesson.recap.map((r, k) => (
              <motion.li key={k} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + k * 0.12 }} className="flex gap-3 text-sm leading-relaxed text-white/85">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: world.color, boxShadow: `0 0 10px ${world.color}` }} />
                {r}
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-3xl p-6">
          <SectionTitle kicker="Added to your toolbelt" title="Commands" />
          <div className="flex flex-col gap-2">
            {lesson.commands.map((c, k) => (
              <motion.div key={c.cmd} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + k * 0.1 }} className="rounded-xl bg-black/30 px-3 py-2">
                <code className="font-mono text-[13px] text-pink">{c.cmd}</code>
                <div className="text-xs text-white/55">{c.what}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/learn/" variant="ghost">
          <MapIcon size={16} /> World map
        </Button>
        {next && (
          <Button href={`/learn/${next.id}/`} size="lg">
            Next: {next.title} <ArrowRight size={18} />
          </Button>
        )}
        {!next && (
          <Button href="/playground/" size="lg">
            🌌 You finished everything! Open the playground
          </Button>
        )}
      </div>
    </div>
  );
}
