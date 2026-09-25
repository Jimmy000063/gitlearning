"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Sparkles, Terminal as TerminalIcon } from "lucide-react";
import { ALL_LESSONS, WORLDS } from "@/content";
import type { World } from "@/content/types";
import { Button } from "@/components/ui/Button";
import { Bit } from "@/components/Mascot";
import { AutoDemo } from "./AutoDemo";
import { Logo } from "@/components/Navbar";

const Galaxy3D = dynamic(() => import("./Galaxy3D"), { ssr: false });

export function Landing() {
  return (
    <>
      <Hero />
      <Marquee />
      <MentalModels />
      <DemoSection />
      <Method />
      <Journey />
      <FinalCTA />
      <Footer />
    </>
  );
}

// ------------------------------------------------------------------ Hero ----

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  const words = ["Don't", "memorize", "Git."];

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0">
        <Galaxy3D />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,2,13,0.55)_55%,#04020d_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-void" />

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass mb-8 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-white/80"
        >
          <Sparkles size={13} className="text-amber" />
          {ALL_LESSONS.length} interactive lessons · 6 worlds · 100% in your browser
        </motion.div>

        <h1 className="font-display text-[clamp(2.4rem,7.5vw,6rem)] font-extrabold leading-[0.95] tracking-tight">
          <span className="block">
            {words.map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 40, rotateX: -80, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.35 + i * 0.12, type: "spring", stiffness: 90, damping: 14 }}
                className="mr-[0.25em] inline-block"
              >
                {w}
              </motion.span>
            ))}
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.8, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.85, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-gradient mt-2 block pb-2"
          >
            Understand it.
          </motion.span>
        </h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-6 max-w-2xl text-base text-white/75 [text-shadow:0_2px_16px_rgba(4,2,13,0.95)] md:text-lg">
          Type real Git commands and watch your repository come alive: commits become stars, branches become constellations, and the mental models finally <em className="text-white">click</em>.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="mt-10 flex flex-wrap justify-center gap-4">
          <Button href="/learn/" size="lg">
            Start your journey <ArrowRight size={18} />
          </Button>
          <Button href="/playground/" variant="ghost" size="lg">
            <TerminalIcon size={18} /> Open the playground
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-16 flex flex-col items-center gap-2 text-xs text-white/40">
          scroll to explore
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="block h-8 w-5 rounded-full border border-white/30">
            <span className="mx-auto mt-1.5 block h-1.5 w-1 rounded-full bg-white/60" />
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  );
}

// --------------------------------------------------------------- Marquee ----

const CMDS = ["git init", "git add .", 'git commit -m "✨"', "git switch -c idea", "git merge feature", "git rebase main", "git stash pop", "git reflog", "git cherry-pick a1b2c3d", "git push -u origin main", "git log --oneline", "git restore --staged", "git revert HEAD", "git cat-file -p HEAD"];

function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-5 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
      <motion.div className="flex w-max gap-4" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
        {[...CMDS, ...CMDS].map((c, i) => (
          <span key={i} className="whitespace-nowrap rounded-xl border border-white/10 bg-black/30 px-4 py-2 font-mono text-sm text-white/60">
            <span className="text-lime">❯</span> {c}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// --------------------------------------------------------- Mental models ----

function SectionHead({ kicker, title, sub, color = "text-violet" }: { kicker: string; title: React.ReactNode; sub?: string; color?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} className="mx-auto mb-14 max-w-3xl text-center">
      <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.25em] ${color}`}>{kicker}</div>
      <h2 className="font-display text-3xl font-bold leading-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-mist md:text-lg">{sub}</p>}
    </motion.div>
  );
}

function MentalModels() {
  const cards = [
    { title: "Commits are snapshots", text: "Not a list of edits: a full photo of your project, with a caption. Every commit is a moment you can return to.", art: <SnapshotArt />, color: "#a78bfa" },
    { title: "Branches are sticky notes", text: "A branch is a movable label on a commit, not a copy of your files. That's why branching is instant.", art: <BranchArt />, color: "#22d3ee" },
    { title: "HEAD is \"you are here\"", text: "One little pointer tells Git what you're looking at. Move it, and your files travel through time.", art: <HeadArt />, color: "#f472b6" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 md:py-36">
      <SectionHead kicker="The secret" title={<>Git isn&apos;t magic.<br /><span className="text-gradient">It&apos;s three simple ideas.</span></>} sub="Most people memorize commands and stay confused. We start with the mental models, and then the commands become obvious." />
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <TiltCard key={c.title} delay={i * 0.15}>
            <div className="mb-6 grid h-40 place-items-center rounded-2xl bg-black/30" style={{ boxShadow: `inset 0 0 60px -20px ${c.color}` }}>
              {c.art}
            </div>
            <h3 className="font-display text-lg font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{c.text}</p>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

function TiltCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.6 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`glass rounded-3xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SnapshotArt() {
  return (
    <div className="relative h-28 w-48">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute top-2 h-24 w-20 rounded-md bg-white p-1.5 shadow-xl"
          style={{ left: i * 30 }}
          initial={{ opacity: 0, y: -30, rotate: -20 }}
          whileInView={{ opacity: 1, y: 0, rotate: (i - 1.5) * 7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.25, type: "spring" }}
        >
          <div className="h-14 rounded-sm bg-gradient-to-br from-violet to-cyan p-1.5">
            {[0, 1, 2].map((l) => (
              <div key={l} className="mb-1 h-1 rounded bg-white/70" style={{ width: `${50 + ((i + l) % 3) * 20}%` }} />
            ))}
          </div>
          <div className="mt-1 h-1 w-10 rounded bg-black/30" />
        </motion.div>
      ))}
    </div>
  );
}

function BranchArt() {
  return (
    <svg viewBox="0 0 200 110" className="h-32 w-56">
      <line x1="20" y1="75" x2="180" y2="75" stroke="#a78bfa" strokeWidth="3" />
      <motion.path d="M80 75 C110 75 100 35 130 35 L160 35" stroke="#22d3ee" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ delay: 0.4, duration: 1 }} />
      {[20, 80, 140, 180].map((x) => (
        <circle key={x} cx={x} cy="75" r="7" fill="#0a0720" stroke="#a78bfa" strokeWidth="3" />
      ))}
      {[130, 160].map((x, i) => (
        <motion.circle key={x} cx={x} cy="35" r="7" fill="#0a0720" stroke="#22d3ee" strokeWidth="3" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1 + i * 0.3 }} />
      ))}
      <rect x="160" y="84" width="38" height="16" rx="4" fill="#a78bfa" />
      <text x="179" y="96" fontSize="10" textAnchor="middle" fill="black" fontWeight="700">main</text>
      <motion.g initial={{ x: -30 }} whileInView={{ x: 0 }} viewport={{ once: true }} transition={{ delay: 1.6, type: "spring" }}>
        <rect x="140" y="6" width="44" height="16" rx="4" fill="#22d3ee" />
        <text x="162" y="18" fontSize="10" textAnchor="middle" fill="black" fontWeight="700">feature</text>
      </motion.g>
    </svg>
  );
}

function HeadArt() {
  const xs = [30, 80, 130, 180];
  return (
    <svg viewBox="0 0 210 110" className="h-32 w-56">
      <line x1="30" y1="80" x2="180" y2="80" stroke="#f472b6" strokeWidth="3" />
      {xs.map((x) => (
        <circle key={x} cx={x} cy="80" r="8" fill="#0a0720" stroke="#f472b6" strokeWidth="3" />
      ))}
      <motion.g animate={{ x: [150, 50, 0, 100, 150] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <path d="M30 60 C18 44 22 26 30 26 C38 26 42 44 30 60 Z" fill="#fbbf24" />
          <circle cx="30" cy="36" r="4" fill="#0a0720" />
          <rect x="12" y="6" width="36" height="14" rx="4" fill="#fbbf24" />
          <text x="30" y="17" fontSize="9" fontWeight="800" textAnchor="middle" fill="black">HEAD</text>
        </motion.g>
      </motion.g>
    </svg>
  );
}

// ------------------------------------------------------------ Live demo ----

function DemoSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24">
      <SectionHead kicker="See it, don't imagine it" color="text-cyan" title={<>Every command, <span className="text-gradient">visualized live</span></>} sub="This isn't a video. A real Git engine runs in your browser, and every command reshapes the graph and the three areas as you watch." />
      <motion.div initial={{ opacity: 0, y: 60, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}>
        <AutoDemo />
      </motion.div>
    </section>
  );
}

// --------------------------------------------------------------- Method ----

function Method() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 50%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const steps = [
    { emoji: "🎬", title: "Hook", text: "Every lesson opens with a real-world \"uh-oh\" moment, so you know WHY before HOW." },
    { emoji: "🧠", title: "Mental model", text: "An everyday analogy (photos, sticky notes, loading docks) builds the right picture in your head." },
    { emoji: "🔍", title: "Watch it happen", text: "Step through a live demo, scrubbing back and forth, while the graph animates each move." },
    { emoji: "🤔", title: "Predict", text: "Guess what a command will do, then see the truth. Wrong guesses reveal the misconceptions." },
    { emoji: "🎯", title: "Challenge", text: "Solve a real scenario in the terminal. Earn stars, XP and badges. Undo anything, fear nothing." },
  ];
  return (
    <section className="mx-auto max-w-4xl overflow-x-clip px-4 py-28">
      <SectionHead kicker="The method" color="text-pink" title={<>Built for <span className="text-gradient">the aha moment</span></>} sub="Five steps per lesson, designed around how people actually learn." />
      <div ref={ref} className="relative">
        <div className="absolute bottom-0 left-7 top-0 w-0.5 bg-white/10 md:left-1/2" />
        <motion.div style={{ scaleY }} className="absolute bottom-0 left-7 top-0 w-0.5 origin-top bg-gradient-to-b from-violet via-cyan to-pink md:left-1/2" />
        <div className="flex flex-col gap-10">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className={`relative flex items-center gap-6 md:w-1/2 ${i % 2 ? "md:ml-auto md:pl-12" : "md:flex-row-reverse md:pr-12 md:text-right"}`}
            >
              <div className={`z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-deep text-2xl shadow-[0_0_30px_-6px_rgba(139,92,246,0.9)] ring-1 ring-white/15 md:absolute ${i % 2 ? "md:-left-7" : "md:-right-7"}`}>
                {s.emoji}
              </div>
              <div className="glass rounded-2xl p-5">
                <div className="font-mono text-xs text-violet">0{i + 1}</div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/65">{s.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------- Journey ----

function Journey() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionHead kicker="The journey" color="text-lime" title={<>Six worlds. <span className="text-gradient">Seedling to wizard.</span></>} sub={`Start from "what even is a commit?" and finish rebasing, cherry-picking and reading Git's internal objects.`} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {WORLDS.map((w, i) => (
          <WorldCard key={w.id} world={w} i={i} />
        ))}
      </div>
    </section>
  );
}

function WorldCard({ world, i }: { world: World; i: number }) {
  return (
    <TiltCard delay={i * 0.08} className="group relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60" style={{ background: world.color }} />
      <div className="relative flex items-center gap-4">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${world.color}, #1a1045 75%)`, boxShadow: `0 0 30px -6px ${world.color}` }}
        >
          {world.emoji}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: world.color }}>
            World {world.n}
          </div>
          <h3 className="font-display text-lg font-semibold">{world.title}</h3>
        </div>
      </div>
      <p className="relative mt-4 text-sm text-white/65">{world.tagline}</p>
      <ul className="relative mt-4 flex flex-col gap-1.5">
        {world.lessons.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-xs text-white/55">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: world.color }} />
            {l.title}
          </li>
        ))}
      </ul>
    </TiltCard>
  );
}

// ------------------------------------------------------------ Final CTA ----

function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-28">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass border-gradient relative overflow-hidden rounded-[2rem] p-10 text-center md:p-16">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-pink/25 blur-3xl" />
        <div className="relative flex flex-col items-center">
          <Bit mood="happy" size={96} />
          <h2 className="mt-6 font-display text-3xl font-bold md:text-5xl">
            Ready to <span className="text-gradient">actually get</span> Git?
          </h2>
          <p className="mt-4 max-w-lg text-mist">No sign-up. No install. Your progress saves right in your browser. First lesson takes 5 minutes.</p>
          <div className="mt-8">
            <Button href="/learn/w1-first-snapshot/" size="lg">
              Make your first commit <ArrowRight size={18} />
            </Button>
          </div>
          <p className="mt-6 text-xs text-white/40">psst… Bit will be there with hints if you get stuck 🤖</p>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
        <Logo />
        <div className="flex gap-6">
          <Link href="/learn/" className="hover:text-white">Learn</Link>
          <Link href="/playground/" className="hover:text-white">Playground</Link>
          <Link href="/cheatsheet/" className="hover:text-white">Cheatsheet</Link>
        </div>
        <span>Made with ✨ and a lot of commits</span>
      </div>
    </footer>
  );
}
