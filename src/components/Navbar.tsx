"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, Volume2, VolumeX } from "lucide-react";
import { useProgress } from "@/store/progress";
import { levelFor } from "@/lib/levels";
import { useHydrated } from "@/lib/useHydrated";

const LINKS = [
  { href: "/learn/", label: "Learn" },
  { href: "/playground/", label: "Playground" },
  { href: "/cheatsheet/", label: "Cheatsheet" },
];

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[20deg]">
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <path d="M9 6v20M9 16c0-5 4-7 8-7h2M9 22c0-4 5-5 10-5" stroke="url(#lg)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="9" cy="6" r="3" fill="#a78bfa" />
        <circle cx="9" cy="26" r="3" fill="#f472b6" />
        <circle cx="22" cy="9" r="3" fill="#22d3ee" />
        <circle cx="22" cy="17" r="3" fill="#a3e635" />
      </svg>
      <span className="font-display text-sm font-semibold tracking-wide">
        GIT<span className="text-gradient">GALAXY</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const path = usePathname();
  const hydrated = useHydrated();
  const { xp, streak, sound, toggleSound } = useProgress();
  const lv = levelFor(hydrated ? xp : 0);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href.slice(0, -1));
            return (
              <Link key={l.href} href={l.href} className="relative rounded-xl px-4 py-1.5 text-sm text-white/70 transition hover:text-white">
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white/10" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {hydrated && streak.count > 0 && (
            <span className="flex items-center gap-1 rounded-xl bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber" title="Daily streak">
              <Flame size={14} /> {streak.count}
            </span>
          )}
          <Link href="/learn/" className="group flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1 hover:bg-white/10" title={`${xp} XP`}>
            <span className="text-base">{lv.emoji}</span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-[11px] font-semibold text-white/90">Lv {lv.level} · {hydrated ? xp : 0} XP</span>
              <span className="mt-0.5 h-1 w-20 overflow-hidden rounded-full bg-white/10">
                <motion.span className="block h-full rounded-full bg-gradient-to-r from-violet to-cyan" animate={{ width: `${lv.progress * 100}%` }} />
              </span>
            </span>
          </Link>
          <button onClick={toggleSound} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Toggle sound">
            {hydrated && !sound ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </nav>
      <div className="mx-auto mt-2 flex max-w-6xl justify-center gap-1 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`glass rounded-xl px-3 py-1 text-xs ${path.startsWith(l.href.slice(0, -1)) ? "text-white" : "text-white/60"}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
